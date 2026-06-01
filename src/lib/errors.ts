export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly detail?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class AuthError extends AppError {
  constructor() {
    super("Unauthorized", 401);
    this.name = "AuthError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

export class InstagramError extends AppError {
  constructor(message: string, detail?: string) {
    super(message, 502, detail);
    this.name = "InstagramError";
  }
}

export class LarkError extends AppError {
  constructor(message: string, detail?: string) {
    super(message, 502, detail);
    this.name = "LarkError";
  }
}

export class TimeoutError extends AppError {
  constructor(message = "Instagram media processing timeout") {
    super(message, 503);
    this.name = "TimeoutError";
  }
}
