'use client';

import React, {useState, useEffect} from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {getSupplements, Supplement} from '@/services/supplements';
import {Schedule} from '@/types';
import {Checkbox} from '@/components/ui/checkbox';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSchedule: (schedule: Schedule) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({isOpen, onClose, onAddSchedule}) => {
  const [supplement, setSupplement] = useState('');
  const [newSupplement, setNewSupplement] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [supplementsList, setSupplementsList] = useState<Supplement[]>([]);

  useEffect(() => {
    const fetchSupplements = async () => {
      try {
        const supplements = await getSupplements();
        setSupplementsList(supplements);
      } catch (error) {
        console.error('Failed to fetch supplements:', error);
      }
    };

    fetchSupplements();
  }, []);

  const handleSubmit = () => {
    if ((supplement !== 'newSupplement' ? supplement : newSupplement) && days.length > 0 && time) {
      const finalSupplement = supplement === 'newSupplement' ? newSupplement : supplement;

      days.forEach((day) => {
        const newSchedule: Schedule = {
          id: Date.now().toString() + '-' + day, // Generate a unique ID including the day
          supplement: finalSupplement,
          day,
          time,
        };
        onAddSchedule(newSchedule);
      });
      onClose();
    } else {
      alert('Please fill in all fields.');
    }
  };

  const handleDayChange = (day: string) => {
    setDays((prevDays) => {
      if (prevDays.includes(day)) {
        return prevDays.filter((d) => d !== day);
      } else {
        return [...prevDays, day];
      }
    });
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Schedule</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="supplement" className="text-right">
              Supplement
            </Label>
            <Select value={supplement} onValueChange={setSupplement} className="col-span-3">
              <SelectTrigger id="supplement">
                <SelectValue placeholder="Select a supplement" />
              </SelectTrigger>
              <SelectContent>
                {supplementsList.map((supplement) => (
                  <SelectItem key={supplement.id} value={supplement.name}>
                    {supplement.name}
                  </SelectItem>
                ))}
                <SelectItem value="newSupplement">New Supplement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {supplement === 'newSupplement' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newSupplement" className="text-right">
                New Supplement
              </Label>
              <Input
                type="text"
                id="newSupplement"
                placeholder="Enter new supplement"
                value={newSupplement}
                onChange={(e) => setNewSupplement(e.target.value)}
                className="col-span-3"
              />
            </div>
          )}

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="day" className="text-right mt-1">
              Days
            </Label>
            <div className="col-span-3 flex flex-col">
              {daysOfWeek.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={day}
                    checked={days.includes(day)}
                    onCheckedChange={() => handleDayChange(day)}
                  />
                  <Label htmlFor={day}>{day}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">
              Time
            </Label>
            <Input
              type="time"
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>
            Add Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
