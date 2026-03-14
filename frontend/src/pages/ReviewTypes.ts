export interface UserInfo {
  name: string;
  id: string;
  avatar: string;
}

export interface Review {
  id: string;
  userType: "Driver" | "Passenger";
  userInfo: UserInfo;
  reviewDate: string;
  visible: boolean;
  isFlagged: boolean;
  rating: number;
  comment: string;
  tags: string[];
  status: "Completed" | "Pending";
}

export interface ReviewHistoryItem {
  id: string;
  rating: number;
  userName: string;
  userType: "Driver" | "Passenger";
  date: string;
  comment: string;
  tags: string[];
  status: "Completed" | "Pending";
  avatar: string;
  visible: boolean;
  isFlagged: boolean;
}

export interface ReviewDetail {
  review: Review & {
    reviewer?: {
      name: string;
      id: string;
      avatar: string;
      type: "Driver" | "Passenger";
    };
  };
  receivedReviews: ReviewHistoryItem[];
  givenReviews: ReviewHistoryItem[];
}
