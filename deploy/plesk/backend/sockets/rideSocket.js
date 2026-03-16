const socketIo = require('socket.io');

const initRideSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: '*', // Adjust to your frontend URL in production
      methods: ['GET', 'POST']
    }
  });

  const rideNamespace = io.of('/ride');

  // In-memory storage for active ride requests and online drivers
  const activeRideRequests = new Map();
  const onlineDrivers = new Map(); // socketId -> driverInfo

  rideNamespace.on('connection', (socket) => {
    console.log('New connection to /ride namespace:', socket.id);

    // --- Driver Logic ---

    // Driver: Go Online
    socket.on('driver:goOnline', (driverInfo) => {
      console.log('Driver online:', driverInfo.id);
      onlineDrivers.set(socket.id, { ...driverInfo, socketId: socket.id });
      socket.join('drivers');
    });

    // Driver: Go Offline
    socket.on('driver:goOffline', () => {
      console.log('Driver offline:', socket.id);
      onlineDrivers.delete(socket.id);
      socket.leave('drivers');
    });

    // Driver: Accept a ride
    socket.on('driver:acceptRide', (payload) => {
      const { rideRequestId } = payload;
      console.log('Driver accepting ride:', rideRequestId, 'Socket:', socket.id);
      
      const ride = activeRideRequests.get(rideRequestId);
      if (ride && ride.status === 'PENDING') {
        ride.status = 'ACCEPTED';
        ride.driverSocketId = socket.id;
        ride.driver = onlineDrivers.get(socket.id);

        // Notify passenger
        rideNamespace.to(ride.passengerSocketId).emit('ride:accepted', {
            rideRequestId,
            distanceToPickup: "2.50",
            estimatedArrivalMinutes: 5,
            driver: ride.driver
        });

        // Acknowledge to driver
        socket.emit('driver:rideAccepted', { success: true, ride });

        // Notify other drivers that the ride is taken
        rideNamespace.to('drivers').emit('ride:taken', { rideRequestId });
      } else {
        socket.emit('driver:rideAccepted', { success: false, message: "Ride already taken or unavailable" });
      }
    });

    // Driver: Cancel a ride
    socket.on('driver:cancelRide', (payload) => {
      const { rideRequestId, reason } = payload;
      console.log('Driver cancelled ride:', rideRequestId, 'Reason:', reason);
      
      const ride = activeRideRequests.get(rideRequestId);
      if (ride && ride.driverSocketId === socket.id) {
        ride.status = 'PENDING';
        ride.driverSocketId = null;
        ride.driver = null;

        // Notify passenger
        rideNamespace.to(ride.passengerSocketId).emit('ride:cancelled', {
          rideRequestId,
          message: "Driver has cancelled the ride. Looking for a new driver."
        });

        // Re-broadcast to other drivers
        socket.to('drivers').emit('ride:newRequest', ride);
      }
    });

    // Driver: Complete a ride
    socket.on('driver:completeRide', (payload) => {
      const { rideRequestId } = payload;
      console.log('Driver completed ride:', rideRequestId);
      
      const ride = activeRideRequests.get(rideRequestId);
      if (ride && ride.driverSocketId === socket.id) {
        ride.status = 'COMPLETED';
        
        // Notify passenger
        rideNamespace.to(ride.passengerSocketId).emit('ride:completed', {
          rideRequestId,
          finalPrice: ride.estimatedPrice
        });

        activeRideRequests.delete(rideRequestId);
        socket.emit('driver:rideCompleted', { success: true });
      }
    });

    // --- Passenger Logic ---

    // Passenger: Request a ride
    socket.on('passenger:requestRide', (payload) => {
      console.log('Ride requested by passenger:', payload);
      
      const rideRequestId = Date.now();
      const rideData = {
        rideRequestId,
        passengerSocketId: socket.id,
        ...payload,
        status: 'PENDING',
        timestamp: new Date().toISOString()
      };

      activeRideRequests.set(rideRequestId, rideData);

      // Acknowledge the request
      socket.emit('ride:requestReceived', {
        message: "Ride request received. Looking for nearby drivers.",
        rideRequestId,
        timestamp: rideData.timestamp
      });

      // Notify nearby drivers
      const driverPayload = {
        rideRequestId,
        rideOfferId: Math.floor(Math.random() * 100000),
        estimatedPrice: payload.estimatedPrice,
        distanceToPickup: 0.5, 
        estimatedArrivalMinutes: 3,
        serviceTypeName: payload.serviceTypeName || "CAR_RIDES",
        distanceKm: payload.distanceKm || 4.2, 
        estimatedDurationMinutes: payload.estimatedDurationMinutes || 12,
        pickup: payload.pickup,
        dropoff: payload.dropoff,
        passenger: payload.passenger || { id: 45, name: "Rooh Ullah" }
      };

      rideNamespace.to('drivers').emit('ride:newRequest', driverPayload);
      
      // FOR DEMO: If no drivers are online, simulate acceptance after 5 seconds
      if (onlineDrivers.size === 0) {
          setTimeout(() => {
              if (activeRideRequests.has(rideRequestId) && activeRideRequests.get(rideRequestId).status === 'PENDING') {
                  console.log('Simulating acceptance for demo (no drivers online)');
                  const acceptanceData = {
                      rideRequestId,
                      distanceToPickup: "2.50",
                      estimatedArrivalMinutes: 5,
                      driver: {
                          id: 45,
                          name: "Demo Driver",
                          phone: "+923001234567",
                          imageUrl: "/uploads/drivers/driver-placeholder.png"
                      }
                  };
                  socket.emit('ride:accepted', acceptanceData);
              }
          }, 5000);
      }
    });

    // Passenger: Cancel a ride
    socket.on('passenger:cancelRide', (payload) => {
      const { rideRequestId, reason } = payload;
      console.log('Ride cancelled by passenger:', rideRequestId);
      
      const ride = activeRideRequests.get(rideRequestId);
      if (ride) {
        activeRideRequests.delete(rideRequestId);
        
        // Notify driver if assigned
        if (ride.driverSocketId) {
            rideNamespace.to(ride.driverSocketId).emit('ride:cancelled', { rideRequestId });
        }
        
        // Notify other drivers
        rideNamespace.to('drivers').emit('ride:taken', { rideRequestId });

        socket.emit('ride:cancelled', {
          rideRequestId,
          message: "Your ride has been cancelled successfully."
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      onlineDrivers.delete(socket.id);
    });
  });

  return io;
};

module.exports = initRideSocket;
