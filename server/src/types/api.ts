export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
