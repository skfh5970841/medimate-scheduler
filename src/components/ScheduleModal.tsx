'use client';

import React, {useState, useEffect} from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Supplement} from '@/services/supplements';
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
        // Retrieve supplements from local storage
        const storedSupplements = localStorage.getItem('supplements');
        if (storedSupplements) {
          setSupplementsList(JSON.parse(storedSupplements));
        } else {
          // Initialize with default supplements if none exist in local storage
          setSupplementsList([
            {id: 'vitamin-d', name: '비타민 D'},
            {id: 'vitamin-c', name: '비타민 C'},
            {id: 'calcium', name: '칼슘'},
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch supplements from local storage:', error);
        // Fallback to default supplements in case of an error
        setSupplementsList([
            {id: 'vitamin-d', name: '비타민 D'},
            {id: 'vitamin-c', name: '비타민 C'},
            {id: 'calcium', name: '칼슘'},
        ]);
      }
    };

    fetchSupplements();
  }, []);

  useEffect(() => {
    // Persist supplements to local storage whenever the list changes
    // Only write if the list is not empty, to avoid overwriting initial defaults with empty array on first load
    if (supplementsList.length > 0) {
        localStorage.setItem('supplements', JSON.stringify(supplementsList));
    }
  }, [supplementsList]);


  const handleSubmit = () => {
    const selectedSupplementName = supplement === 'newSupplement' ? newSupplement.trim() : supplement;

    if (!selectedSupplementName) {
      alert('영양제를 선택하거나 입력해주세요.');
      return;
    }
     if (days.length === 0) {
      alert('요일을 선택해주세요.');
      return;
    }
     if (!time) {
      alert('시간을 선택해주세요.');
      return;
    }

    // If 'New Supplement' was selected and a name was entered
    if (supplement === 'newSupplement' && newSupplement) {
      const trimmedNewSupplement = newSupplement.trim();
      const newId = trimmedNewSupplement.toLowerCase().replace(/\s+/g, '-');

      // Check if supplement with the same name or ID already exists (case-insensitive check for name)
      if (!supplementsList.some(s => s.id === newId || s.name.toLowerCase() === trimmedNewSupplement.toLowerCase())) {
        const newSupplementObject: Supplement = {
          id: newId, // Generate a unique ID
          name: trimmedNewSupplement,
        };
        // Use functional update to ensure we have the latest list state
        setSupplementsList(prevList => [...prevList, newSupplementObject]);
        // No need to setSupplement here, finalSupplement handles it
      } else {
          // If it already exists, use the existing one
          const existingSupplement = supplementsList.find(s => s.id === newId || s.name.toLowerCase() === trimmedNewSupplement.toLowerCase());
          if(existingSupplement) {
              // Optional: alert user that the supplement already exists
              // alert(`영양제 '${existingSupplement.name}'는 이미 존재합니다.`);
              // Use the existing supplement name for the schedule
              // setSupplement(existingSupplement.name); // This would switch the select dropdown
          }
      }
    }

    // Add the schedule(s)
    days.forEach((day) => {
      const newSchedule: Schedule = {
        id: Date.now().toString() + '-' + day + '-' + selectedSupplementName.replace(/\s+/g, '-'), // More unique ID
        supplement: selectedSupplementName,
        day,
        time,
      };
      onAddSchedule(newSchedule);
    });

    // Reset form fields and close modal
    setSupplement('');
    setNewSupplement('');
    setDays([]);
    setTime('');
    onClose();

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

  // Korean day names map
  const daysOfWeekMap: {[key: string]: string} = {
      'Monday': '월요일',
      'Tuesday': '화요일',
      'Wednesday': '수요일',
      'Thursday': '목요일',
      'Friday': '금요일',
      'Saturday': '토요일',
      'Sunday': '일요일'
  };
  const daysOfWeek = Object.keys(daysOfWeekMap); // Use English keys for internal logic

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>스케줄 추가</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="supplement" className="text-right">
              영양제
            </Label>
            <Select value={supplement} onValueChange={setSupplement} >
              <SelectTrigger id="supplement" className="col-span-3">
                <SelectValue placeholder="영양제 선택" />
              </SelectTrigger>
              <SelectContent>
                {supplementsList.map((s) => (
                  <SelectItem key={s.id} value={s.name}> {/* Use name as value for consistency */}
                    {s.name}
                  </SelectItem>
                ))}
                <SelectItem value="newSupplement">새 영양제 추가</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {supplement === 'newSupplement' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newSupplement" className="text-right">
                새 영양제 이름
              </Label>
              <Input
                type="text"
                id="newSupplement"
                placeholder="새 영양제 이름 입력"
                value={newSupplement}
                onChange={(e) => setNewSupplement(e.target.value)}
                className="col-span-3"
              />
            </div>
          )}

          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="day" className="text-right mt-1">
              요일
            </Label>
            <div className="col-span-3 grid grid-cols-2 gap-x-4 gap-y-2"> {/* Use grid for better layout */}
              {daysOfWeek.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={day}
                    checked={days.includes(day)}
                    onCheckedChange={() => handleDayChange(day)}
                  />
                  {/* Display Korean day name */}
                  <Label htmlFor={day} className="font-normal">{daysOfWeekMap[day]}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time" className="text-right">
              시간
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
           <Button variant="outline" onClick={onClose}>취소</Button> {/* Add Cancel button */}
          <Button type="submit" onClick={handleSubmit}>
            스케줄 추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
