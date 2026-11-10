export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}
export const badRequest = (m = 'Bad request', d) => new ApiError(400, m, d);
export const unauthorized = (m = 'Authentication required') => new ApiError(401, m);
export const forbidden = (m = 'You do not have permission to perform this action') => new ApiError(403, m);
export const notFound = (m = 'Resource not found') => new ApiError(404, m);
export const conflict = (m = 'Conflict') => new ApiError(409, m);
export const invalid = (details, m = 'Validation failed') => new ApiError(422, m, details);
