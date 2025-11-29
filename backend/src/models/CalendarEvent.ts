import mongoose, { Schema, Document } from 'mongoose';

export interface ICalendarEvent extends Document {
  userId: string;
  title: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  description?: string;
  color?: string;
  seriesId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const calendarEventSchema = new Schema<ICalendarEvent>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date },
    allDay: { type: Boolean, default: false },
    description: { type: String },
    color: { type: String },
    seriesId: { type: String, index: true },
  },
  { timestamps: true }
);

calendarEventSchema.index({ userId: 1, start: 1 });

export const CalendarEvent =
  mongoose.models.CalendarEvent ||
  mongoose.model<ICalendarEvent>('CalendarEvent', calendarEventSchema);


