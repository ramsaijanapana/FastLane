require('dotenv').config();

const bcrypt = require('bcryptjs');
const compression = require('compression');
const cors = require('cors');
const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const path = require('path');

const parseList = (value) =>
  String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const isTruthy = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const PORT = Number.parseInt(process.env.PORT ?? '4000', 10);
const NODE_ENV = process.env.NODE_ENV ?? 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const TRUST_PROXY = isTruthy(process.env.TRUST_PROXY, IS_PRODUCTION) ? 1 : false;
const SERVE_WEB_DIST = isTruthy(process.env.SERVE_WEB_DIST, IS_PRODUCTION);
const ENFORCE_HTTPS = isTruthy(process.env.ENFORCE_HTTPS, IS_PRODUCTION);
const JWT_SECRET = process.env.FASTLANE_JWT_SECRET ?? 'fastlane-dev-secret';
const JWT_ISSUER = process.env.FASTLANE_JWT_ISSUER ?? 'fastlane-api';
const JWT_AUDIENCE = process.env.FASTLANE_JWT_AUDIENCE ?? 'fastlane-app';
const OAUTH_PUBLIC_BASE_URL = String(
  process.env.OAUTH_PUBLIC_BASE_URL ?? '',
).replace(/\/$/, '');
const GOOGLE_OAUTH_CLIENT_ID = String(
  process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
).trim();
const GOOGLE_OAUTH_CLIENT_SECRET = String(
  process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
).trim();
const FACEBOOK_APP_ID = String(process.env.FACEBOOK_APP_ID ?? '').trim();
const FACEBOOK_APP_SECRET = String(process.env.FACEBOOK_APP_SECRET ?? '').trim();
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:19006',
  'http://127.0.0.1:19006',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];
const ALLOWED_WEB_ORIGINS = (() => {
  const configured = parseList(process.env.ALLOWED_WEB_ORIGINS);

  if (configured.length > 0) {
    return configured;
  }

  if (IS_PRODUCTION && OAUTH_PUBLIC_BASE_URL) {
    return [OAUTH_PUBLIC_BASE_URL];
  }

  return DEFAULT_DEV_ORIGINS;
})();
const ALLOWED_REDIRECT_PREFIXES = Array.from(
  new Set([
    ...parseList(
      process.env.OAUTH_ALLOWED_REDIRECT_PREFIXES ??
        'fastlane://,exp://,http://localhost,http://127.0.0.1,https://localhost,https://127.0.0.1',
    ),
    ...ALLOWED_WEB_ORIGINS,
  ]),
);
const PROJECT_ROOT = path.join(__dirname, '..');
const WEB_DIST_DIR = path.join(PROJECT_ROOT, 'dist');
const WEB_INDEX_FILE = path.join(WEB_DIST_DIR, 'index.html');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const oauthHandoffs = new Map();

const providerNames = {
  google: 'Google',
  facebook: 'Facebook',
};

const createMemoryRateLimiter = ({
  windowMs,
  max,
  keyPrefix,
  message,
  keyFn = (req) => req.ip || 'unknown',
}) => {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${keyPrefix}:${keyFn(req)}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    if (existing.count >= max) {
      res.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil((existing.resetAt - now) / 1000))),
      );
      res.status(429).json({ error: message });
      return;
    }

    existing.count += 1;

    if (buckets.size > 5000) {
      for (const [entryKey, entry] of buckets.entries()) {
        if (entry.resetAt <= now) {
          buckets.delete(entryKey);
        }
      }
    }

    next();
  };
};

const globalRateLimiter = createMemoryRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  keyPrefix: 'global',
  message: 'Too many requests. Please try again shortly.',
});

const authRateLimiter = createMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'auth',
  message: 'Too many sign-in attempts. Please wait before retrying.',
});

const syncWriteRateLimiter = createMemoryRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  keyPrefix: 'sync-write',
  message: 'Sync rate limit reached. Slow down and retry.',
});

const cleanUpExpiredHandoffs = () => {
  const now = Date.now();

  for (const [code, entry] of oauthHandoffs.entries()) {
    if (entry.expiresAt <= now) {
      oauthHandoffs.delete(code);
    }
  }
};

const normalizeUser = (user) => ({
  id: String(user?.id ?? `user-${Date.now()}`),
  email: String(user?.email ?? '')
    .trim()
    .toLowerCase(),
  name: String(user?.name ?? '').trim() || 'Tracker',
  passwordHash:
    typeof user?.passwordHash === 'string' && user.passwordHash.length > 0
      ? user.passwordHash
      : null,
  socialAccounts: Array.isArray(user?.socialAccounts)
    ? user.socialAccounts
        .filter(
          (account) =>
            account &&
            typeof account.provider === 'string' &&
            typeof account.providerUserId === 'string',
        )
        .map((account) => ({
          provider: account.provider,
          providerUserId: account.providerUserId,
          linkedAt:
            typeof account.linkedAt === 'number' ? account.linkedAt : Date.now(),
        }))
    : [],
  createdAt: typeof user?.createdAt === 'number' ? user.createdAt : Date.now(),
});

const normalizeDb = (db) => ({
  users: Array.isArray(db?.users) ? db.users.map(normalizeUser) : [],
  syncStates: Array.isArray(db?.syncStates) ? db.syncStates : [],
});

const ensureDb = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ users: [], syncStates: [] }, null, 2),
      'utf8',
    );
  }
};

const loadDb = () => {
  ensureDb();
  return normalizeDb(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
};

const saveDb = (db) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(normalizeDb(db), null, 2), 'utf8');
};

const signSession = (
  user,
  provider = 'password',
  { isPlaceholderEmail = false } = {},
) => ({
  token: jwt.sign({ sub: user.id, email: user.email, provider }, JWT_SECRET, {
    expiresIn: '30d',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  }),
  email: user.email,
  name: user.name,
  provider,
  isPlaceholderEmail,
});

const getErrorMessage = (error, fallback = 'Request failed.') => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const isValidEmail = (value) =>
  typeof value === 'string' &&
  value.length <= 254 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isStrongPassword = (value) =>
  typeof value === 'string' &&
  value.length >= 8 &&
  /[A-Za-z]/.test(value) &&
  /\d/.test(value);

const auth = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header.' });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const sanitizeState = (state) => {
  if (!state || typeof state !== 'object') {
    return null;
  }

  return {
    activeFast: state.activeFast ?? null,
    fastHistory: Array.isArray(state.fastHistory)
      ? state.fastHistory.slice(0, 400)
      : [],
    meals: Array.isArray(state.meals) ? state.meals.slice(0, 1000) : [],
    waterEntries: Array.isArray(state.waterEntries)
      ? state.waterEntries.slice(0, 2000)
      : [],
    xp: typeof state.xp === 'number' ? state.xp : 0,
    settings: state.settings ?? {},
    lastUpdatedAt:
      typeof state.lastUpdatedAt === 'number' ? state.lastUpdatedAt : Date.now(),
  };
};

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  return ALLOWED_WEB_ORIGINS.includes(origin);
};

const isAllowedClientRedirect = (redirectUri) => {
  if (!redirectUri || typeof redirectUri !== 'string') {
    return false;
  }

  try {
    new URL(redirectUri);
  } catch {
    return false;
  }

  return ALLOWED_REDIRECT_PREFIXES.some((prefix) => redirectUri.startsWith(prefix));
};

const buildClientRedirect = (redirectUri, params = {}) => {
  const url = new URL(redirectUri);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const buildProviderCallbackUrl = (req, provider) => {
  const forwardedHost = req.get('x-forwarded-host');
  const host = forwardedHost || req.get('host');
  const baseUrl = OAUTH_PUBLIC_BASE_URL || `${req.protocol}://${host}`;

  return `${baseUrl}/auth/oauth/${provider}/callback`;
};

const getProviderConfig = (provider, req) => {
  if (provider === 'google') {
    if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
      return null;
    }

    return {
      clientId: GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: GOOGLE_OAUTH_CLIENT_SECRET,
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      tokenMethod: 'POST',
      scopeSeparator: ' ',
      scopes: ['openid', 'profile', 'email'],
      callbackUrl: buildProviderCallbackUrl(req, provider),
    };
  }

  if (provider === 'facebook') {
    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      return null;
    }

    return {
      clientId: FACEBOOK_APP_ID,
      clientSecret: FACEBOOK_APP_SECRET,
      authorizationEndpoint: 'https://www.facebook.com/dialog/oauth',
      tokenEndpoint: 'https://graph.facebook.com/oauth/access_token',
      tokenMethod: 'GET',
      scopeSeparator: ',',
      scopes: ['public_profile', 'email'],
      callbackUrl: buildProviderCallbackUrl(req, provider),
    };
  }

  return null;
};

const getMissingProviderConfigError = (provider) =>
  `${providerNames[provider] ?? 'That'} sign-in is not configured on the server yet.`;

const createOAuthState = (provider, redirectUri) =>
  jwt.sign(
    {
      provider,
      redirectUri,
      purpose: 'oauth-state',
    },
    JWT_SECRET,
    {
      expiresIn: '10m',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );

const verifyOAuthState = (provider, rawState) => {
  const payload = jwt.verify(rawState, JWT_SECRET, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (
    payload.provider !== provider ||
    payload.purpose !== 'oauth-state' ||
    !isAllowedClientRedirect(payload.redirectUri)
  ) {
    throw new Error('Invalid OAuth state.');
  }

  return payload;
};

const readResponsePayload = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const requestProviderTokens = async (providerConfig, code) => {
  const body = new URLSearchParams({
    client_id: providerConfig.clientId,
    client_secret: providerConfig.clientSecret,
    redirect_uri: providerConfig.callbackUrl,
    code,
    grant_type: 'authorization_code',
  });
  const requestUrl =
    providerConfig.tokenMethod === 'GET'
      ? `${providerConfig.tokenEndpoint}?${body.toString()}`
      : providerConfig.tokenEndpoint;
  const response = await fetch(requestUrl, {
    method: providerConfig.tokenMethod,
    headers:
      providerConfig.tokenMethod === 'POST'
        ? {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        : undefined,
    body: providerConfig.tokenMethod === 'POST' ? body : undefined,
  });
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new Error(
      payload?.error_description ??
        payload?.error?.message ??
        payload?.error ??
        'Unable to exchange the OAuth code.',
    );
  }

  return payload;
};

const fetchGoogleProfile = async (accessToken) => {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await readResponsePayload(response);

  if (!response.ok || !payload?.sub) {
    throw new Error(
      payload?.error_description ??
        payload?.error?.message ??
        'Unable to load the Google profile.',
    );
  }

  return {
    providerUserId: String(payload.sub),
    email:
      typeof payload.email === 'string'
        ? payload.email.trim().toLowerCase()
        : null,
    name: String(payload.name ?? payload.given_name ?? 'Google User'),
  };
};

const fetchFacebookProfile = async (accessToken) => {
  const profileUrl = new URL('https://graph.facebook.com/me');
  profileUrl.searchParams.set('fields', 'id,name,email');
  profileUrl.searchParams.set('access_token', accessToken);

  const response = await fetch(profileUrl);
  const payload = await readResponsePayload(response);

  if (!response.ok || !payload?.id) {
    throw new Error(
      payload?.error?.message ?? 'Unable to load the Facebook profile.',
    );
  }

  return {
    providerUserId: String(payload.id),
    email:
      typeof payload.email === 'string'
        ? payload.email.trim().toLowerCase()
        : null,
    name: String(payload.name ?? 'Facebook User'),
  };
};

const fetchProviderProfile = async (provider, accessToken) => {
  if (provider === 'google') {
    return fetchGoogleProfile(accessToken);
  }

  if (provider === 'facebook') {
    return fetchFacebookProfile(accessToken);
  }

  throw new Error('Unsupported sign-in provider.');
};

const ensureSyncStateForUser = (db, userId) => {
  if (db.syncStates.some((entry) => entry.userId === userId)) {
    return;
  }

  db.syncStates.push({
    userId,
    state: null,
    updatedAt: null,
  });
};

const findUserBySocialAccount = (db, provider, providerUserId) =>
  db.users.find((user) =>
    user.socialAccounts.some(
      (account) =>
        account.provider === provider && account.providerUserId === providerUserId,
    ),
  );

const upsertOAuthUser = ({ provider, providerUserId, email, name }) => {
  const db = loadDb();
  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const placeholderEmail = `${provider}-${providerUserId}@fastlane.local`;
  let user =
    findUserBySocialAccount(db, provider, providerUserId) ??
    (normalizedEmail
      ? db.users.find((entry) => entry.email === normalizedEmail)
      : undefined);

  if (!user) {
    user = normalizeUser({
      id: `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      email: normalizedEmail ?? placeholderEmail,
      name,
      passwordHash: null,
      socialAccounts: [
        {
          provider,
          providerUserId,
          linkedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
    });

    db.users.push(user);
  } else {
    if (
      normalizedEmail &&
      (!user.email || user.email.endsWith('@fastlane.local'))
    ) {
      user.email = normalizedEmail;
    }

    if (name && (!user.name || user.name === 'Tracker')) {
      user.name = name;
    }

    if (
      !user.socialAccounts.some(
        (account) =>
          account.provider === provider &&
          account.providerUserId === providerUserId,
      )
    ) {
      user.socialAccounts.push({
        provider,
        providerUserId,
        linkedAt: Date.now(),
      });
    }
  }

  ensureSyncStateForUser(db, user.id);
  saveDb(db);

  return {
    user,
    isPlaceholderEmail: !normalizedEmail && user.email === placeholderEmail,
  };
};

const createOAuthHandoff = (session) => {
  cleanUpExpiredHandoffs();

  const code = crypto.randomBytes(18).toString('hex');
  oauthHandoffs.set(code, {
    session,
    expiresAt: Date.now() + 2 * 60 * 1000,
  });

  return code;
};

const consumeOAuthHandoff = (code) => {
  cleanUpExpiredHandoffs();

  const entry = oauthHandoffs.get(code);

  if (!entry) {
    return null;
  }

  oauthHandoffs.delete(code);

  if (entry.expiresAt <= Date.now()) {
    return null;
  }

  return entry.session;
};

const assertProductionConfig = () => {
  if (!IS_PRODUCTION) {
    return;
  }

  if (
    JWT_SECRET === 'fastlane-dev-secret' ||
    JWT_SECRET === 'change-me-before-production'
  ) {
    throw new Error('FASTLANE_JWT_SECRET must be changed before production.');
  }

  if (!OAUTH_PUBLIC_BASE_URL || !OAUTH_PUBLIC_BASE_URL.startsWith('https://')) {
    throw new Error('OAUTH_PUBLIC_BASE_URL must be set to an HTTPS URL in production.');
  }

  if (ALLOWED_WEB_ORIGINS.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('ALLOWED_WEB_ORIGINS must use HTTPS in production.');
  }

  if (SERVE_WEB_DIST && !fs.existsSync(WEB_INDEX_FILE)) {
    throw new Error('dist/index.html is missing. Run `npm run build:web` first.');
  }
};

assertProductionConfig();
ensureDb();

const app = express();

app.set('trust proxy', TRUST_PROXY);
app.disable('x-powered-by');

app.use((req, res, next) => {
  if (!ENFORCE_HTTPS) {
    next();
    return;
  }

  const forwardedProto = req.get('x-forwarded-proto');

  if (!forwardedProto || forwardedProto === 'https') {
    next();
    return;
  }

  const secureUrl = `https://${req.get('host')}${req.originalUrl}`;

  if (req.method === 'GET' || req.method === 'HEAD') {
    res.redirect(308, secureUrl);
    return;
  }

  res.status(400).json({ error: 'HTTPS is required.' });
});

app.use(globalRateLimiter);
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed.'));
    },
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  }),
);
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    contentSecurityPolicy: SERVE_WEB_DIST
      ? {
          directives: {
            defaultSrc: ["'self'"],
            baseUri: ["'self'"],
            blockAllMixedContent: [],
            connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
            fontSrc: ["'self'", 'data:'],
            formAction: [
              "'self'",
              'https://accounts.google.com',
              'https://www.facebook.com',
            ],
            frameAncestors: ["'none'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            objectSrc: ["'none'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            upgradeInsecureRequests: IS_PRODUCTION ? [] : null,
          },
        }
      : false,
    hsts: IS_PRODUCTION
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    referrerPolicy: {
      policy: 'no-referrer',
    },
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    mode: NODE_ENV,
    web: SERVE_WEB_DIST && fs.existsSync(WEB_INDEX_FILE),
  });
});

app.post('/auth/register', authRateLimiter, async (req, res) => {
  const db = loadDb();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');
  const name = String(req.body.name ?? '').trim() || 'Tracker';

  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }

  if (!isStrongPassword(password)) {
    res.status(400).json({
      error: 'Password must be at least 8 characters and include letters and numbers.',
    });
    return;
  }

  if (db.users.some((user) => user.email === email)) {
    res.status(409).json({ error: 'That email is already registered.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id: `user-${Date.now()}`,
    email,
    name,
    passwordHash,
    socialAccounts: [],
    createdAt: Date.now(),
  };

  db.users.push(user);
  db.syncStates.push({
    userId: user.id,
    state: null,
    updatedAt: null,
  });
  saveDb(db);

  res.status(201).json({
    session: signSession(user),
  });
});

app.post('/auth/login', authRateLimiter, async (req, res) => {
  const db = loadDb();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');
  const user = db.users.find((entry) => entry.email === email);

  if (!user) {
    res.status(404).json({ error: 'No account exists for that email.' });
    return;
  }

  if (!user.passwordHash) {
    res.status(400).json({
      error: 'This account uses a social sign-in provider. Use Google or Facebook instead.',
    });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  res.json({
    session: signSession(user),
  });
});

app.get('/auth/oauth/:provider/start', authRateLimiter, (req, res) => {
  const provider = String(req.params.provider ?? '').toLowerCase();
  const redirectUri = String(req.query.redirect_uri ?? '');

  if (!isAllowedClientRedirect(redirectUri)) {
    res.status(400).json({
      error: 'A valid app redirect URI is required for social sign-in.',
    });
    return;
  }

  const providerConfig = getProviderConfig(provider, req);

  if (!providerConfig) {
    res.redirect(
      buildClientRedirect(redirectUri, {
        error: getMissingProviderConfigError(provider),
      }),
    );
    return;
  }

  const authUrl = new URL(providerConfig.authorizationEndpoint);
  authUrl.searchParams.set('client_id', providerConfig.clientId);
  authUrl.searchParams.set('redirect_uri', providerConfig.callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set(
    'scope',
    providerConfig.scopes.join(providerConfig.scopeSeparator),
  );
  authUrl.searchParams.set('state', createOAuthState(provider, redirectUri));

  if (provider === 'google') {
    authUrl.searchParams.set('prompt', 'select_account');
  }

  if (provider === 'facebook') {
    authUrl.searchParams.set('display', 'popup');
  }

  res.redirect(authUrl.toString());
});

app.get('/auth/oauth/:provider/callback', async (req, res) => {
  const provider = String(req.params.provider ?? '').toLowerCase();
  const rawState = String(req.query.state ?? '');

  if (!rawState) {
    res.status(400).send('Missing OAuth state.');
    return;
  }

  let redirectUri;

  try {
    const verifiedState = verifyOAuthState(provider, rawState);
    redirectUri = verifiedState.redirectUri;
  } catch (error) {
    res.status(400).send(getErrorMessage(error, 'Invalid OAuth state.'));
    return;
  }

  const providerError = String(req.query.error ?? '').trim();
  const providerErrorDescription = String(
    req.query.error_description ?? '',
  ).trim();

  if (providerError) {
    res.redirect(
      buildClientRedirect(redirectUri, {
        error: providerErrorDescription || providerError,
      }),
    );
    return;
  }

  const authorizationCode = String(req.query.code ?? '').trim();

  if (!authorizationCode) {
    res.redirect(
      buildClientRedirect(redirectUri, {
        error: 'The provider did not return an authorization code.',
      }),
    );
    return;
  }

  const providerConfig = getProviderConfig(provider, req);

  if (!providerConfig) {
    res.redirect(
      buildClientRedirect(redirectUri, {
        error: getMissingProviderConfigError(provider),
      }),
    );
    return;
  }

  try {
    const tokenPayload = await requestProviderTokens(
      providerConfig,
      authorizationCode,
    );
    const accessToken = String(tokenPayload?.access_token ?? '').trim();

    if (!accessToken) {
      throw new Error('The provider did not return an access token.');
    }

    const profile = await fetchProviderProfile(provider, accessToken);
    const { user, isPlaceholderEmail } = upsertOAuthUser({
      provider,
      ...profile,
    });
    const handoff = createOAuthHandoff(
      signSession(user, provider, { isPlaceholderEmail }),
    );

    res.redirect(
      buildClientRedirect(redirectUri, {
        handoff,
      }),
    );
  } catch (error) {
    res.redirect(
      buildClientRedirect(redirectUri, {
        error: getErrorMessage(error, 'Unable to complete social sign-in.'),
      }),
    );
  }
});

app.post('/auth/oauth/complete', authRateLimiter, (req, res) => {
  const handoff = String(req.body.handoff ?? '').trim();

  if (!handoff) {
    res.status(400).json({ error: 'A social sign-in handoff code is required.' });
    return;
  }

  const session = consumeOAuthHandoff(handoff);

  if (!session) {
    res.status(400).json({
      error: 'The social sign-in handoff is missing or has expired.',
    });
    return;
  }

  res.json({ session });
});

app.get('/auth/me', auth, (req, res) => {
  const db = loadDb();
  const user = db.users.find((entry) => entry.id === req.userId);

  if (!user) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  res.json({
    user: {
      email: user.email,
      name: user.name,
    },
  });
});

app.get('/sync/state', auth, (req, res) => {
  const db = loadDb();
  const syncState = db.syncStates.find((entry) => entry.userId === req.userId);

  res.json({
    state: syncState?.state ?? null,
    updatedAt: syncState?.updatedAt ?? null,
  });
});

app.put('/sync/state', auth, syncWriteRateLimiter, (req, res) => {
  const db = loadDb();
  const sanitized = sanitizeState(req.body.state);

  if (!sanitized) {
    res.status(400).json({ error: 'A valid state payload is required.' });
    return;
  }

  const updatedAt = Date.now();
  const existing = db.syncStates.find((entry) => entry.userId === req.userId);

  if (existing) {
    existing.state = sanitized;
    existing.updatedAt = updatedAt;
  } else {
    db.syncStates.push({
      userId: req.userId,
      state: sanitized,
      updatedAt,
    });
  }

  saveDb(db);

  res.json({ updatedAt });
});

if (SERVE_WEB_DIST && fs.existsSync(WEB_INDEX_FILE)) {
  app.use(
    express.static(WEB_DIST_DIR, {
      index: false,
      maxAge: IS_PRODUCTION ? '1y' : 0,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store');
          return;
        }

        if (IS_PRODUCTION) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  app.get(/^(?!\/(?:auth|sync|health)\b).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(WEB_INDEX_FILE);
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error?.message === 'Origin not allowed.') {
    res.status(403).json({ error: 'Origin not allowed.' });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(error);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Fastlane server listening on http://0.0.0.0:${PORT}`);
});
