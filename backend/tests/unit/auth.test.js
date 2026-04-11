const jwt = require('jsonwebtoken');
const { signToken, requireAuth, optionalAuth } = require('../../middleware/auth');

const TEST_SECRET = process.env.JWT_SECRET;

// Helper: mock Express req/res/next
function mockReqResNext(overrides = {}) {
  const req = { headers: {}, ...overrides };
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };
  const next = jest.fn();
  return { req, res, next };
}

// ================================================
// signToken
// ================================================
describe('signToken', () => {
  test('generates a valid JWT containing user fields', () => {
    const user = { id: 'u1', email: 'a@b.com', name: 'Alice' };
    const token = signToken(user);

    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.id).toBe('u1');
    expect(decoded.email).toBe('a@b.com');
    expect(decoded.name).toBe('Alice');
  });

  test('token expires in the future', () => {
    const token = signToken({ id: '1', email: 'x@y.com', name: 'X' });
    const decoded = jwt.verify(token, TEST_SECRET);
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

// ================================================
// requireAuth middleware
// ================================================
describe('requireAuth', () => {
  test('rejects request with no Authorization header', () => {
    const { req, res, next } = mockReqResNext();
    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/missing/i);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects request with malformed header (no Bearer)', () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: 'Token abc123' }
    });
    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects request with invalid/expired token', () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: 'Bearer totally.invalid.token' }
    });
    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches user and calls next() for valid token', () => {
    const token = signToken({ id: 'u1', email: 'a@b.com', name: 'Alice' });
    const { req, res, next } = mockReqResNext({
      headers: { authorization: `Bearer ${token}` }
    });
    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'u1', email: 'a@b.com', name: 'Alice' });
  });
});

// ================================================
// optionalAuth middleware
// ================================================
describe('optionalAuth', () => {
  test('proceeds without user when no header present', () => {
    const { req, res, next } = mockReqResNext();
    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  test('proceeds without user when token is invalid', () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: 'Bearer bad.token.here' }
    });
    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  test('attaches user when valid token is present', () => {
    const token = signToken({ id: 'u2', email: 'b@c.com', name: 'Bob' });
    const { req, res, next } = mockReqResNext({
      headers: { authorization: `Bearer ${token}` }
    });
    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('u2');
  });
});
