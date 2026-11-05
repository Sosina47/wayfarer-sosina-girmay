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
    <div className="p-5 rounded-[6px] bg-[#191A1D] border border-[#303136] space-y-4">
      <div className="flex items-center justify-between border-b border-[#303136] pb-3">
        <div>
          <h3 className="text-base font-semibold text-[#E8E8ED] font-serif">Guided Tours</h3>
          <p className="text-xs text-[#A5A5B0] mt-0.5">
            Upcoming departures · Read-only preview
          </p>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#101012] border border-[#303136] text-[#7770FF]">
          {slots.length} {slots.length === 1 ? 'slot' : 'slots'}
        </span>
      </div>

      <div className="space-y-2.5">
        {slots.map(slot => (
          <div
            key={slot.id}
            className="p-3 rounded bg-[#101012] border border-[#303136] flex items-center justify-between gap-3 text-xs"
          >
            <div>
              <span className="font-semibold text-[#E8E8ED] block">
                {formatSlotTime(slot.startsAt)}
              </span>
              <span className="text-[#A5A5B0] text-[11px]">
                Capacity: {slot.capacity} seats
              </span>
            </div>

            <div className="text-right">
              {slot.seatsLeft === 0 ? (
                <span className="text-[#A5A5B0] font-medium">Fully booked</span>
              ) : slot.seatsLeft <= 3 ? (
                <span className="text-[#7770FF] font-semibold">
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

      <p className="text-[11px] text-[#A5A5B0] italic text-center pt-1">
        Interactive booking & concurrency safeguards will activate in Slice 4.
      </p>
    </div>
  );
};
