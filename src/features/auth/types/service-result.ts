export type ServiceSuccess<T> = {
  success: true;
  data: T;
};

export type ServiceFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[] | undefined>;
  };
};

export type ServiceResult<T> =
  | ServiceSuccess<T>
  | ServiceFailure;