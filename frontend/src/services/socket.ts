import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";

const SOCKET_URL = API_BASE_URL;

class RideSocketService {
  private socket: Socket | null = null;
  private rideNamespace: Socket | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL);
      this.rideNamespace = io(`${SOCKET_URL}/ride`);

      this.rideNamespace.on("connect", () => {
        console.log("Connected to ride namespace");
      });

      this.rideNamespace.on("connect_error", (error) => {
        console.error("Ride namespace connection error:", error);
      });
    }
  }

  disconnect() {
    if (this.rideNamespace) {
      this.rideNamespace.disconnect();
      this.rideNamespace = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Passenger: Request a ride
  requestRide(payload: {
    pickup: { latitude: number; longitude: number; address: string };
    dropoff: { latitude: number; longitude: number; address: string };
    serviceTypeId: number;
    selectedPreferences: number[];
    estimatedPrice: number;
    couponId?: number;
  }) {
    if (this.rideNamespace) {
      this.rideNamespace.emit("passenger:requestRide", payload);
    }
  }

  // Passenger: Cancel a ride
  cancelRide(rideRequestId: number, reason?: string) {
    if (this.rideNamespace) {
      this.rideNamespace.emit("passenger:cancelRide", {
        rideRequestId,
        reason,
      });
    }
  }

  // --- Driver Actions ---

  goOnline(driverInfo: {
    id: number;
    name: string;
    phone: string;
    imageUrl?: string | null;
  }) {
    if (this.rideNamespace) {
      this.rideNamespace.emit("driver:goOnline", driverInfo);
    }
  }

  goOffline() {
    if (this.rideNamespace) {
      this.rideNamespace.emit("driver:goOffline");
    }
  }

  acceptRide(rideRequestId: number) {
    if (this.rideNamespace) {
      this.rideNamespace.emit("driver:acceptRide", { rideRequestId });
    }
  }

  driverCancelRide(rideRequestId: number, reason?: string) {
    if (this.rideNamespace) {
      this.rideNamespace.emit("driver:cancelRide", { rideRequestId, reason });
    }
  }

  completeRide(rideRequestId: number) {
    if (this.rideNamespace) {
      this.rideNamespace.emit("driver:completeRide", { rideRequestId });
    }
  }

  // --- Event Listeners ---

  onRideReceived(
    callback: (data: {
      message: string;
      rideRequestId: number;
      timestamp: string;
    }) => void,
  ) {
    this.rideNamespace?.on("ride:requestReceived", callback);
  }

  onRideAccepted(callback: (data: any) => void) {
    this.rideNamespace?.on("ride:accepted", callback);
  }

  onRideCompleted(
    callback: (data: { rideRequestId: number; finalPrice: number }) => void,
  ) {
    this.rideNamespace?.on("ride:completed", callback);
  }

  onRideCancelled(
    callback: (data: { rideRequestId: number; message: string }) => void,
  ) {
    this.rideNamespace?.on("ride:cancelled", callback);
  }

  // Driver Listeners
  onNewRequest(callback: (data: any) => void) {
    this.rideNamespace?.on("ride:newRequest", callback);
  }

  onRideTaken(callback: (data: { rideRequestId: number }) => void) {
    this.rideNamespace?.on("ride:taken", callback);
  }

  onDriverRideAccepted(
    callback: (data: {
      success: boolean;
      ride?: any;
      message?: string;
    }) => void,
  ) {
    this.rideNamespace?.on("driver:rideAccepted", callback);
  }

  // Remove listeners
  offAll() {
    this.rideNamespace?.off("ride:requestReceived");
    this.rideNamespace?.off("ride:accepted");
    this.rideNamespace?.off("ride:completed");
    this.rideNamespace?.off("ride:cancelled");
    this.rideNamespace?.off("ride:newRequest");
    this.rideNamespace?.off("ride:taken");
    this.rideNamespace?.off("driver:rideAccepted");
  }
}

export const rideSocket = new RideSocketService();
