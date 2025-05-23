
'use client';

import React, {useState, useEffect} from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Supplement} from '@/services/supplements'; // Assumes Supplement type is defined here or globally
import {Schedule} from '@/types'; // Assumes Schedule type in @/types includes quantity
import {Checkbox} from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSchedule: (schedule: Schedule) => void; // onAddSchedule now expects Schedule with quantity
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({isOpen, onClose, onAddSchedule}) => {
  const [supplement, setSupplement] = useState('');
  const [newSupplement, setNewSupplement] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [quantity, setQuantity] = useState<number>(1); // State for quantity
  const [supplementsList, setSupplementsList] = useState<Supplement[]>([]);

  useEffect(() => {
    const fetchSupplements = async () => {
      try {
        const storedSupplements = localStorage.getItem('supplements');
        if (storedSupplements) {
          setSupplementsList(JSON.parse(storedSupplements));
        } else {
          setSupplementsList([
            {id: 'vitamin-d', name: '비타민 D'},
            {id: 'vitamin-c', name: '비타민 C'},
            {id: 'calcium', name: '칼슘'},
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch supplements from local storage:', error);
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
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      alert('알약 개수는 0보다 큰 정수여야 합니다.');
      return;
    }

    if (supplement === 'newSupplement' && newSupplement) {
      const trimmedNewSupplement = newSupplement.trim();
      const newId = trimmedNewSupplement.toLowerCase().replace(/\s+/g, '-');
      if (!supplementsList.some(s => s.id === newId || s.name.toLowerCase() === trimmedNewSupplement.toLowerCase())) {
        const newSupplementObject: Supplement = {
          id: newId, 
          name: trimmedNewSupplement,
        };
        setSupplementsList(prevList => [...prevList, newSupplementObject]);
      } else {
          const existingSupplement = supplementsList.find(s => s.id === newId || s.name.toLowerCase() === trimmedNewSupplement.toLowerCase());
          // if(existingSupplement) { // Optional: alert or use existing supplement's name }
      }
    }

    days.forEach((day) => {
      const newSchedule: Schedule = {
        id: `${Date.now()}-${day}-${selectedSupplementName.replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`,
        supplement: selectedSupplementName,
        day,
        time,
        quantity: quantity, // Include quantity in the schedule object
        timestamp: Date.now(),
      };
      onAddSchedule(newSchedule); // This function should handle API call
    });

    setSupplement('');
    setNewSupplement('');
    setDays([]);
    setTime('');
    setQuantity(1); // Reset quantity to default
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

  const daysOfWeekMap: {[key: string]: string} = {
      'Monday': '월', 'Tuesday': '화', 'Wednesday': '수', 'Thursday': '목', 'Friday': '금', 'Saturday': '토', 'Sunday': '일'
  };
  const daysOfWeek = Object.keys(daysOfWeekMap);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md sm:max-w-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>스케줄 추가</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Supplement Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="supplement" className="text-left sm:text-right">영양제</Label>
            <div className="col-span-1 sm:col-span-3">
                <Select value={supplement} onValueChange={setSupplement}>
                  <SelectTrigger id="supplement"><SelectValue placeholder="영양제 선택" /></SelectTrigger>
                  <SelectContent><ScrollArea className="h-48">
                        {supplementsList.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                        <SelectItem value="newSupplement">새 영양제 추가</SelectItem>
                  </ScrollArea></SelectContent>
                </Select>
            </div>
          </div>

          {supplement === 'newSupplement' && (
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="newSupplement" className="text-left sm:text-right">새 이름</Label>
              <Input type="text" id="newSupplement" placeholder="새 영양제 이름 입력" value={newSupplement} onChange={(e) => setNewSupplement(e.target.value)} className="col-span-1 sm:col-span-3" />
            </div>
          )}

          {/* Day Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
             <Label htmlFor="day" className="text-left sm:text-right mt-1">요일</Label>
            <div className="col-span-1 sm:col-span-3 grid grid-cols-3 sm:grid-cols-4 gap-x-2 sm:gap-x-4 gap-y-2">
              {daysOfWeek.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox id={day} checked={days.includes(day)} onCheckedChange={() => handleDayChange(day)} />
                  <Label htmlFor={day} className="font-normal text-sm">{daysOfWeekMap[day]}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="time" className="text-left sm:text-right">시간</Label>
            <Input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} className="col-span-1 sm:col-span-3" />
          </div>

          {/* Quantity Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="quantity" className="text-left sm:text-right">알약 개수</Label>
            <Input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="col-span-1 sm:col-span-3"
              min="1"
            />
          </div>
        </div>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-0">
           <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">취소</Button>
           <Button type="submit" onClick={handleSubmit} className="w-full sm:w-auto">스케줄 추가</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
