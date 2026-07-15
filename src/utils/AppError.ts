// =====================================================
// Application Error — Custom error class for service-layer business errors
// =====================================================

export type AppErrorCode =
  // 400
  | 'VALIDATION_ERROR'
  // 401
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED'
  // 403
  | 'FORBIDDEN'
  // 404
  | 'NOT_FOUND'
  // 409
  | 'ALREADY_EXISTS'
  | 'STUDENT_NUMBER_ALREADY_EXISTS'
  | 'NIS_ALREADY_EXISTS'
  | 'STUDENT_HAS_SUBMISSIONS'
  | 'STUDENT_HAS_ATTENDANCE'
  | 'USER_HAS_DEPENDENTS'
  | 'SCHOOL_HAS_DEPENDENTS'
  // 422
  | 'BUSINESS_RULE_VIOLATION'
  // 500
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { statusCode?: number; details?: unknown }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = options?.statusCode ?? AppError.defaultStatusFor(code);
    this.details = options?.details;
    // Maintain proper stack trace in V8
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }

  private static defaultStatusFor(code: AppErrorCode): number {
    switch (code) {
      case 'VALIDATION_ERROR':
        return 400;
      case 'UNAUTHORIZED':
      case 'INVALID_CREDENTIALS':
      case 'TOKEN_EXPIRED':
        return 401;
      case 'FORBIDDEN':
        return 403;
      case 'NOT_FOUND':
        return 404;
      case 'ALREADY_EXISTS':
      case 'STUDENT_NUMBER_ALREADY_EXISTS':
      case 'NIS_ALREADY_EXISTS':
      case 'STUDENT_HAS_SUBMISSIONS':
      case 'STUDENT_HAS_ATTENDANCE':
      case 'USER_HAS_DEPENDENTS':
      case 'SCHOOL_HAS_DEPENDENTS':
        return 409;
      case 'BUSINESS_RULE_VIOLATION':
        return 422;
      case 'INTERNAL_ERROR':
      default:
        return 500;
    }
  }
}