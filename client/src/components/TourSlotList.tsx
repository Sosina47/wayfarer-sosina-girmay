import React, { useState, useEffect } from 'react';
import { TourSlotItem } from '../types/index.js';
import { bookSeats, ApiError } from '../services/api.js';

interface TourSlotListProps {
  slots: TourSlotItem[];
  onBookingSuccess: () => void;
}

interface TourSlotRowProps {
  slot: TourSlotItem;
  onBookingSuccess: () => void;
}

const TourSlotRow: React.FC<TourSlotRowProps> = ({ slot, onBookingSuccess }) => {
  const [selectedSeats, setSelectedSeats] = useState<number>(1);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [seatsLeft, setSeatsLeft] = useState<number>(slot.seatsLeft);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with prop updates (e.g. after parent reload)
  useEffect(() => {
    setSeatsLeft(slot.seatsLeft);
  }, [slot.seatsLeft]);

  const formatSlotTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const formattedTime = formatSlotTime(slot.startsAt);
  const maxSelectable = Math.min(seatsLeft, 10);

  // Adjust selected seats if capacity drops
  useEffect(() => {
    if (selectedSeats > maxSelectable && maxSelectable > 0) {
      setSelectedSeats(maxSelectable);
    }
  }, [maxSelectable, selectedSeats]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (seatsLeft <= 0) return;

    setIsBooking(true);
    try {
      const res = await bookSeats(slot.id, selectedSeats);
      setSeatsLeft(res.slot.seatsLeft);
      setSuccessMessage(
        `Booked! ${selectedSeats} ${selectedSeats === 1 ? 'seat' : 'seats'} on ${formattedTime}.`
      );
      onBookingSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SLOT_FULL') {
          setErrorMessage(
            'Sorry, this tour just filled up. Someone booked the last seat before you.'
          );
          setSeatsLeft(0);
          onBookingSuccess();
        } else if (err.code === 'NOT_ENOUGH_SEATS') {
          const details = err.details as { seatsLeft?: number } | undefined;
          const currentLeft = details?.seatsLeft ?? 0;
          setSeatsLeft(currentLeft);
          setErrorMessage(
            `Only ${currentLeft} ${currentLeft === 1 ? 'seat is' : 'seats are'} left now. Pick a smaller group.`
          );
          onBookingSuccess();
        } else {
          setErrorMessage(err.message || "Couldn't complete your booking. Please try again.");
        }
      } else {
        setErrorMessage("Couldn't complete your booking. Please try again.");
      }
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="p-3.5 rounded bg-[#1D1916] border border-[#3A332C] space-y-2.5 transition-colors">
      <div className="flex items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-semibold text-[#F3EBDD] block text-sm">
            {formattedTime}
          </span>
          <span className="text-[#8F8374] text-[11px]">
            Capacity: {slot.capacity} seats
          </span>
        </div>

        <div className="text-right">
          {seatsLeft === 0 ? (
            <span className="text-[#8F8374] font-medium px-2 py-0.5 rounded bg-[#25201C] border border-[#3A332C]">
              Fully booked
            </span>
          ) : seatsLeft <= 3 ? (
            <span className="text-[#D9694A] font-semibold">
              Only {seatsLeft} {seatsLeft === 1 ? 'seat' : 'seats'} left
            </span>
          ) : (
            <span className="text-[#9BAE7F] font-medium">
              {seatsLeft} seats left
            </span>
          )}
        </div>
      </div>

      {/* Booking Form Controls */}
      {seatsLeft > 0 ? (
        <form onSubmit={handleBook} className="pt-1 flex items-center justify-end gap-2">
          <label htmlFor={`seats-select-${slot.id}`} className="text-xs text-[#8F8374]">
            Seats:
          </label>
          <select
            id={`seats-select-${slot.id}`}
            aria-label={`Select seats for ${formattedTime}`}
            value={selectedSeats}
            onChange={e => {
              setSelectedSeats(parseInt(e.target.value, 10));
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            disabled={isBooking}
            className="bg-[#25201C] text-[#F3EBDD] text-xs font-medium px-2 py-1 rounded border border-[#3A332C] focus:outline-none focus:ring-1 focus:ring-[#D9694A] cursor-pointer"
          >
            {Array.from({ length: maxSelectable }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={isBooking}
            className="px-3 py-1 rounded text-xs font-semibold bg-[#D9694A] text-[#1D1916] hover:bg-[#E07D62] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isBooking ? 'Booking…' : 'Book'}
          </button>
        </form>
      ) : (
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            disabled
            className="px-3 py-1 rounded text-xs font-semibold bg-[#25201C] text-[#8F8374] border border-[#3A332C] cursor-not-allowed"
          >
            Full
          </button>
        </div>
      )}

      {/* Inline Feedback Messages */}
      {errorMessage && (
        <div className="p-2 rounded bg-[#331C18] border border-[#7A2E22] text-[#F5B4A8] text-xs leading-relaxed">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="p-2 rounded bg-[#1C291E] border border-[#395B3E] text-[#9BAE7F] text-xs font-medium flex items-center gap-1.5">
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};

export const TourSlotList: React.FC<TourSlotListProps> = ({ slots, onBookingSuccess }) => {
  if (slots.length === 0) {
    return null;
  }

  return (
    <div className="p-5 rounded-[6px] bg-[#25201C] border border-[#3A332C] space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#3A332C] pb-3">
        <div>
          <h3 className="text-base font-semibold text-[#F3EBDD]">Guided Tours</h3>
          <p className="text-xs text-[#8F8374] mt-0.5">
            Instant booking with real-time capacity
          </p>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#2E2822] border border-[#3A332C] text-[#9BAE7F]">
          {slots.length} {slots.length === 1 ? 'slot' : 'slots'}
        </span>
      </div>

      <div className="space-y-3">
        {slots.map(slot => (
          <TourSlotRow
            key={slot.id}
            slot={slot}
            onBookingSuccess={onBookingSuccess}
          />
        ))}
      </div>
    </div>
  );
};
