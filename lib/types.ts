export type ApiRouteInnerSuccess<T> = { success: true; data: T };
export type ApiRouteInnerError = { success: false; error: string; status?: number };
export type ApiRouteInnerResponse<T> = ApiRouteInnerSuccess<T> | ApiRouteInnerError;

export type ApiEnvelope<T> = { data: ApiRouteInnerResponse<T> };
