# Wayfarer — Architectural & Technical Decisions


## 1. Place Ranking Formula

### Implementation and Mathematical Formula

Wayfarer ranks places using a Bayesian weighted-average rating algorithm implemented in `server/src/lib/ranking.ts`:

$$\text{score} = \left(\frac{v}{v + m}\right) \cdot R + \left(\frac{m}{v + m}\right) \cdot C$$

Where:
- $v$: **Review count** for the individual place ($v \ge 0$).
- $R$: **Average rating** of the place (arithmetic mean of its reviews;
- $C$: **Global mean rating** across all reviews in the entire database 
- $m$: **Prior weight constant**, configured as $m = 10$.

### Why This Formula Was Selected

A standard arithmetic mean suffers from extreme sensitivity to small sample sizes: a newly opened bakery with a single 5-star review ($v = 1, R = 5.0$) will mathematically outrank a world-renowned historical site with 300 reviews averaging 4.8 ($v = 300, R = 4.8$).

The Bayesian average solves this by acting as a weighted compromise between a venue's observed average ($R$) and the global expectation across all venues ($C$):

---

## 2. Preventing Tour Booking Overbooking

### The Atomic Solution: Conditional SQL Update

Wayfarer prevents overbooking using a parameterized conditional `UPDATE` executed inside an interactive Prisma transaction (`server/src/services/bookingService.ts`):

```sql
UPDATE tour_slots
SET booked_seats = booked_seats + $seats
WHERE id = $slotId
  AND booked_seats + $seats <= capacity;
```

It prevents overbooking using a conditional SQL update inside a Prisma transaction.

Instead of checking availability separately and then updating the seat count, the database increases `booked_seats` only when the requested seats fit within the slot's capacity. This avoids race conditions when multiple users try to book the same slot simultaneously: PostgreSQL coordinates concurrent updates to the same row, so each request evaluates the condition against the current row state.

If the update affects zero rows, the service rejects the booking with a `409 Conflict`. If it succeeds, the service creates the booking record within the same transaction. Both operations commit together or roll back together, preventing partial bookings.

A database `CHECK` constraint provides an additional safeguard by ensuring that `booked_seats` can never be negative or exceed capacity.

---

## 3. What I Would Improve With More Time

With more time, I would focus on the following improvements:

1. **Booking Cancellation:** Allow users to cancel their existing bookings and automatically restore the seats to the available capacity.

2. **Waitlist Notifications:** Allow users to join a waitlist for fully booked slots and notify them when seats become available due to cancellations.

3. **Secure User Authentication:** Replace the current acting-user simulator with a proper authentication system.

4. **Administrative Dashboard:** Build an interface for managing tour schedules, capacities, and bookings.
