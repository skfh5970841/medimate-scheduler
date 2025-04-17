'use client';

import React, {useState, useEffect} from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {getSupplements, Supplement} from '@/services/supplements';
import {Schedule} from '@/types';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSchedule: (schedule: Schedule) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({isOpen, onClose, onAddSchedule}) => {
  const [supplement, setSupplement] = useState('');
  const [newSupplement, setNewSupplement] = useState('');
  const [day, setDay] = useState('');
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
    if ((supplement || newSupplement) && day && time) {
      const finalSupplement = newSupplement || supplement;

      const newSchedule: Schedule = {
        id: Date.now().toString(), // Generate a unique ID
        supplement: finalSupplement,
        day,
        time,
      };
      onAddSchedule(newSchedule);
      onClose();
    } else {
      alert('Please fill in all fields.');
    }
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
              </SelectContent>
            </Select>
          </div>

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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="day" className="text-right">
              Day
            </Label>
            <Select value={day} onValueChange={setDay} className="col-span-3">
              <SelectTrigger id="day">
                <SelectValue placeholder="Select a day" />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
