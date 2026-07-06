export type ServiceSuccess<T> = {
  success: true;
  data: T;
};

export type ServiceFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;