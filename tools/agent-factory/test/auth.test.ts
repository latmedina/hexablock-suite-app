import { describe, expect, it } from 'vitest';
import { isAuthorized } from '../src/infrastructure/auth';

const req = (auth?: string) => new Request('http://x/api/pipeline', { method: 'POST', headers: auth ? { authorization: auth } : {} });

describe('isAuthorized', () => {
  it('should_allow_request_when_no_token_is_configured', () => {
    // Arrange
    const request = req();
    // Act
    const ok = isAuthorized(request, undefined);
    // Assert
    expect(ok).toBe(true);
  });

  it('should_reject_request_when_bearer_token_is_wrong', () => {
    // Arrange
    const request = req('Bearer nope');
    // Act
    const ok = isAuthorized(request, 'secret-token');
    // Assert
    expect(ok).toBe(false);
  });

  it('should_allow_request_when_bearer_token_matches', () => {
    // Arrange
    const request = req('Bearer secret-token');
    // Act
    const ok = isAuthorized(request, 'secret-token');
    // Assert
    expect(ok).toBe(true);
  });
});
