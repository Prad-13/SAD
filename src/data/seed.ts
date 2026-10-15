import type { AppState, Battery, Notification, Payment, Reservation, SwapSession, User } from '../types';
import { DEMO_PASSWORD, hashPassword } from '../services/authService';

// ALL DATA BELOW IS FICTIONAL SAMPLE DATA for a college project demo.

const daysAgo = (d: number, hour = 10, minute = 0) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(hour, minute, 0, 0);
  return t.toISOString();
};
const daysAhead = (d: number, hour = 17) => daysAgo(-d, hour);

const bat = (
  id: string,
  stationId: string,
  batteryType: Battery['batteryType'],
  chargePercentage: number,
  healthPercentage: number,
  status: Battery['status'],
): Battery => ({
  id,
  stationId,
  batteryType,
  capacityKWh: batteryType === 'VS-48V' ? 1.5 : batteryType === 'VS-60V' ? 2.4 : 3.2,
  chargePercentage,
  healthPercentage,
  status,
});

export function createSeed(): AppState {
  const batteries: Battery[] = [
    // Station STN-1001
    bat('BAT-4801', 'STN-1001', 'VS-48V', 98, 96, 'FULLY_CHARGED'),
    bat('BAT-4802', 'STN-1001', 'VS-48V', 95, 91, 'FULLY_CHARGED'),
    bat('BAT-4803', 'STN-1001', 'VS-48V', 64, 93, 'CHARGING'),
    bat('BAT-4804', 'STN-1001', 'VS-48V', 12, 88, 'DEPLETED'),
    bat('BAT-6001', 'STN-1001', 'VS-60V', 100, 97, 'RESERVED'),
    bat('BAT-6002', 'STN-1001', 'VS-60V', 40, 62, 'IN_INVENTORY'),
    // Station STN-1002
    bat('BAT-4805', 'STN-1002', 'VS-48V', 92, 90, 'FULLY_CHARGED'),
    bat('BAT-6003', 'STN-1002', 'VS-60V', 99, 95, 'FULLY_CHARGED'),
    bat('BAT-7201', 'STN-1002', 'VS-72V', 99, 94, 'FULLY_CHARGED'),
    bat('BAT-7202', 'STN-1002', 'VS-72V', 55, 92, 'CHARGING'),
    bat('BAT-7203', 'STN-1002', 'VS-72V', 20, 89, 'DEPLETED'),
    // Station STN-1003
    bat('BAT-6004', 'STN-1003', 'VS-60V', 97, 93, 'FULLY_CHARGED'),
    bat('BAT-7204', 'STN-1003', 'VS-72V', 96, 95, 'FULLY_CHARGED'),
    bat('BAT-7205', 'STN-1003', 'VS-72V', 91, 90, 'FULLY_CHARGED'),
    bat('BAT-6005', 'STN-1003', 'VS-60V', 80, 94, 'CHARGING'),
    bat('BAT-7206', 'STN-1003', 'VS-72V', 0, 100, 'CREATED'),
    // Batteries currently installed in customer vehicles
    bat('BAT-4890', 'STN-1001', 'VS-48V', 18, 87, 'IN_USE'),
    bat('BAT-6090', 'STN-1001', 'VS-60V', 22, 90, 'IN_USE'),
    bat('BAT-7290', 'STN-1002', 'VS-72V', 15, 91, 'IN_USE'),
  ];

  const mkRes = (
    id: string, ownerId: string, vehicleId: string, stationId: string, batteryId: string,
    slot: string, status: Reservation['status'], paymentStatus: Reservation['paymentStatus'], fee: number,
  ): Reservation => ({
    id, ownerId, vehicleId, stationId, batteryId, slot, createdAt: slot, status, paymentStatus, estimatedFee: fee,
    qrCode: `VS:${id}:SEED01`, expiresAt: slot,
  });

  const reservations: Reservation[] = [
    mkRes('RSV-SEED-0001', 'USR-O1', 'VEH-1', 'STN-1001', 'BAT-4890', daysAgo(3), 'COMPLETED', 'PAID', 95),
    mkRes('RSV-SEED-0002', 'USR-O2', 'VEH-2', 'STN-1001', 'BAT-6090', daysAgo(2), 'COMPLETED', 'PAID', 126),
    mkRes('RSV-SEED-0003', 'USR-O3', 'VEH-3', 'STN-1002', 'BAT-7290', daysAgo(1), 'COMPLETED', 'PAID', 158),
    mkRes('RSV-SEED-0004', 'USR-O1', 'VEH-1', 'STN-1001', 'BAT-4802', daysAgo(5), 'CANCELLED', 'FAILED', 95),
    mkRes('RSV-SEED-0005', 'USR-O2', 'VEH-2', 'STN-1001', 'BAT-6001', daysAhead(0, 18), 'CONFIRMED', 'PAID', 126),
    mkRes('RSV-SEED-0006', 'USR-O1', 'VEH-1', 'STN-1001', 'BAT-4890', daysAgo(5, 15), 'COMPLETED', 'PAID', 95),
    mkRes('RSV-SEED-0007', 'USR-O3', 'VEH-3', 'STN-1003', 'BAT-7290', daysAgo(4, 12), 'COMPLETED', 'PAID', 158),
  ];
  // The seeded confirmed reservation must be in the future relative to "now" at seed time.
  reservations[4].slot = daysAhead(1, 11);
  reservations[4].createdAt = daysAgo(0, 8);
  reservations[4].expiresAt = new Date(new Date(reservations[4].slot).getTime() + 60 * 60000).toISOString();

  const sw = (
    id: string, reservationId: string, stationId: string, returned: string, assigned: string, at: string,
  ): SwapSession => ({
    id, reservationId, stationId, returnedBatteryId: returned, assignedBatteryId: assigned,
    startedAt: at, completedAt: new Date(new Date(at).getTime() + 6 * 60000).toISOString(), status: 'COMPLETED',
  });

  const swaps: SwapSession[] = [
    sw('SWP-SEED-0001', 'RSV-SEED-0001', 'STN-1001', 'BAT-4804', 'BAT-4890', daysAgo(3)),
    sw('SWP-SEED-0002', 'RSV-SEED-0002', 'STN-1001', 'BAT-6002', 'BAT-6090', daysAgo(2)),
    sw('SWP-SEED-0003', 'RSV-SEED-0003', 'STN-1002', 'BAT-7203', 'BAT-7290', daysAgo(1)),
    sw('SWP-SEED-0006', 'RSV-SEED-0006', 'STN-1001', 'BAT-4803', 'BAT-4890', daysAgo(5, 15)),
    sw('SWP-SEED-0007', 'RSV-SEED-0007', 'STN-1003', 'BAT-7202', 'BAT-7290', daysAgo(4, 12)),
  ];

  const pay = (
    id: string, reservationId: string, amount: number, method: Payment['method'], status: Payment['status'],
    ref: string, at: string,
  ): Payment => ({ id, reservationId, amount, method, status, transactionReference: ref, createdAt: at });

  const payments: Payment[] = [
    pay('PAY-SEED-0001', 'RSV-SEED-0001', 95, 'UPI', 'SUCCESS', 'SIM-UPI-8F3K21QA', daysAgo(3, 9)),
    pay('PAY-SEED-0002', 'RSV-SEED-0002', 126, 'CARD', 'SUCCESS', 'SIM-CARD-2D9X77LM', daysAgo(2, 9)),
    pay('PAY-SEED-0003', 'RSV-SEED-0003', 158, 'CASH', 'SUCCESS', 'SIM-CASH-5T6B90ZC', daysAgo(1)),
    pay('PAY-SEED-0004', 'RSV-SEED-0004', 95, 'UPI', 'FAILED', 'SIM-UPI-0X0FAIL1', daysAgo(5, 9)),
    pay('PAY-SEED-0005', 'RSV-SEED-0005', 126, 'UPI', 'SUCCESS', 'SIM-UPI-7H4N55PW', daysAgo(0, 8)),
    pay('PAY-SEED-0006', 'RSV-SEED-0006', 95, 'UPI', 'SUCCESS', 'SIM-UPI-1A2B3C4D', daysAgo(5, 14)),
    pay('PAY-SEED-0007', 'RSV-SEED-0007', 158, 'CARD', 'SUCCESS', 'SIM-CARD-9Z8Y7X6W', daysAgo(4, 11)),
  ];

  const mkUser = (id: string, name: string, email: string, phone: string, role: User['role'], stationId?: string): User => ({
    id, name, email, phone, role, active: true, passwordHash: hashPassword(email, DEMO_PASSWORD), ...(stationId ? { stationId } : {}),
  });
  const users: User[] = [
    mkUser('USR-O1', 'Aarav Sharma', 'aarav.sharma@demo.voltswap.in', '9876500001', 'OWNER'),
    mkUser('USR-O2', 'Diya Nair', 'diya.nair@demo.voltswap.in', '9876500002', 'OWNER'),
    mkUser('USR-O3', 'Rohan Iyer', 'rohan.iyer@demo.voltswap.in', '9876500003', 'OWNER'),
    mkUser('USR-P1', 'Meera Krishnan', 'meera.k@demo.voltswap.in', '9876500011', 'OPERATOR', 'STN-1001'),
    mkUser('USR-P2', 'Suresh Patil', 'suresh.p@demo.voltswap.in', '9876500012', 'OPERATOR', 'STN-1002'),
    mkUser('USR-P3', 'Anita Desai', 'anita.d@demo.voltswap.in', '9876500013', 'OPERATOR', 'STN-1003'),
    mkUser('USR-A1', 'Vikram Rao', 'vikram.rao@demo.voltswap.in', '9876500021', 'ADMIN'),
  ];

  const notifications: Notification[] = [
    { id: 'NTF-SEED-0001', userId: 'USR-O3', channel: 'IN_APP', recipient: 'rohan.iyer@demo.voltswap.in', subject: 'Swap completed', message: 'Swap SWP-SEED-0003 done. Receipt RCT-SEED-0003.', createdAt: daysAgo(1), read: true, reservationId: 'RSV-SEED-0003' },
    { id: 'NTF-SEED-0002', userId: 'USR-O2', channel: 'IN_APP', recipient: 'diya.nair@demo.voltswap.in', subject: 'Reservation confirmed', message: 'Reservation RSV-SEED-0005 is confirmed. Show your QR code to the operator.', createdAt: daysAgo(0, 8), read: false, reservationId: 'RSV-SEED-0005' },
    { id: 'NTF-SEED-0003', userId: 'USR-O2', channel: 'SMS', recipient: '9876500002', subject: 'Reservation confirmed', message: 'Reservation RSV-SEED-0005 is confirmed. Show your QR code to the operator.', createdAt: daysAgo(0, 8), read: true, reservationId: 'RSV-SEED-0005' },
  ];

  return {
    users,
    vehicles: [
      { id: 'VEH-1', ownerId: 'USR-O1', registrationNumber: 'KA01 EV 1024', batteryType: 'VS-48V', model: 'Volt Scooter S1', currentBatteryId: 'BAT-4890' },
      { id: 'VEH-2', ownerId: 'USR-O2', registrationNumber: 'KA05 EV 7781', batteryType: 'VS-60V', model: 'Volt Cargo Trike T2', currentBatteryId: 'BAT-6090' },
      { id: 'VEH-3', ownerId: 'USR-O3', registrationNumber: 'KA03 EV 3309', batteryType: 'VS-72V', model: 'Volt Auto A3', currentBatteryId: 'BAT-7290' },
    ],
    stations: [
      { id: 'STN-1001', name: 'Koramangala Swap Hub', address: 'Plot 14, 5th Block, Demo Nagar, Bengaluru', supportedBatteryTypes: ['VS-48V', 'VS-60V'], status: 'OPEN', pricePerSwap: 90, slotCapacity: 2, demoDistanceKm: 1.8 },
      { id: 'STN-1002', name: 'Whitefield Tech Park Station', address: 'Gate 3, Sample Tech Park Road, Bengaluru', supportedBatteryTypes: ['VS-48V', 'VS-60V', 'VS-72V'], status: 'OPEN', pricePerSwap: 150, slotCapacity: 3, demoDistanceKm: 6.4 },
      { id: 'STN-1003', name: 'Electronic City Swap Bay', address: 'Unit 7, Example Industrial Layout, Bengaluru', supportedBatteryTypes: ['VS-60V', 'VS-72V'], status: 'OPEN', pricePerSwap: 120, slotCapacity: 2, demoDistanceKm: 11.2 },
    ],
    batteries,
    reservations,
    swaps,
    payments,
    notifications,
  };
}
