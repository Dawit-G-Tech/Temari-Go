export type DriverFeedbackRequest = {
  driver_id: string;
  parent_id: string;
  rating: number; // 1-5
  comment?: string;
};

export type DriverFeedbackResponse = {
  message?: string;
  data?: unknown;
  [key: string]: unknown;
};

