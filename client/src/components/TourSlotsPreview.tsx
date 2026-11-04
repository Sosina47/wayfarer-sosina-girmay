import React from 'react';
import { TourSlotItem } from '../types/index.js';

interface TourSlotsPreviewProps {
  slots: TourSlotItem[];
}

export const TourSlotsPreview: React.FC<TourSlotsPreviewProps> = ({ slots }) => {
  if (slots.length === 0) {
    return null;
  }

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

  return (
    <div className="p-5 rounded-[6px] bg-[#25201C] border border-[#3A332C] space-y-4">
      <div className="flex items-center justify-between border-b border-[#3A332C] pb-3">
        <div>
          <h3 className="text-base font-semibold text-[#F3EBDD]">Guided Tours</h3>
          <p className="text-xs text-[#8F8374] mt-0.5">
            Upcoming departures · Read-only preview
          </p>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#2E2822] border border-[#3A332C] text-[#9BAE7F]">
          {slots.length} {slots.length === 1 ? 'slot' : 'slots'}
        </span>
      </div>

      <div className="space-y-2.5">
        {slots.map(slot => (
          <div
            key={slot.id}
            className="p-3 rounded bg-[#1D1916] border border-[#3A332C] flex items-center justify-between gap-3 text-xs"
          >
            <div>
              <span className="font-semibold text-[#F3EBDD] block">
                {formatSlotTime(slot.startsAt)}
              </span>
              <span className="text-[#8F8374] text-[11px]">
                Capacity: {slot.capacity} seats
              </span>
            </div>

            <div className="text-right">
              {slot.seatsLeft === 0 ? (
                <span className="text-[#8F8374] font-medium">Fully booked</span>
              ) : slot.seatsLeft <= 3 ? (
                <span className="text-[#D9694A] font-semibold">
                  Only {slot.seatsLeft} {slot.seatsLeft === 1 ? 'seat' : 'seats'} left
                </span>
              ) : (
                <span className="text-[#9BAE7F] font-medium">
                  {slot.seatsLeft} seats left
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#8F8374] italic text-center pt-1">
        Interactive booking & concurrency safeguards will activate in Slice 4.
      </p>
    </div>
  );
};
