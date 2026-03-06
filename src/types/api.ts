export interface ApiSuccessResponse<T> {
  data: T;
  meta?: {
    lastUpdated?: string;
    source?: string;
  };
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
