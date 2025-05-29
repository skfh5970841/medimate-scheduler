
'use client';

import React, {useState, useEffect} from 'react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Supplement, getSupplements} from '@/services/supplements'; // Import getSupplements
import {Schedule} from '@/types';
import {Checkbox} from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSchedule: (schedule: Schedule) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({isOpen, onClose, onAddSchedule}) => {
  const [supplement, setSupplement] = useState('');
  const [newSupplement, setNewSupplement] = useState(''); // This might need to be re-evaluated or removed
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [supplementsList, setSupplementsList] = useState<Supplement[]>([]);

  useEffect(() => {
    const fetchSupplementsList = async () => {
      try {
        const supplements = await getSupplements(); // Use getSupplements
        setSupplementsList(supplements);
      } catch (error) {
        console.error('Failed to fetch supplements list:', error);
        setSupplementsList([]); // Fallback to empty list on error
      }
    };
    if (isOpen) { // Fetch supplements when modal is opened
        fetchSupplementsList();
    }
  }, [isOpen]); // Re-fetch if modal is re-opened

  // Remove useEffect that saves to localStorage, as supplements.json is the source of truth
  // useEffect(() => {
  //   if (supplementsList.length > 0) {
  //       localStorage.setItem('supplements', JSON.stringify(supplementsList));
  //   }
  // }, [supplementsList]);

  const handleSubmit = () => {
    // Simplified: remove direct new supplement addition from this modal
    // 영양제 추가는 영양제 관리 페이지에서 하도록 유도 (추후 개선 가능)
    const selectedSupplementName = supplement;

    if (!selectedSupplementName) {
      alert('영양제를 선택해주세요.');
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

    // Logic for adding new supplement to supplementsList and potentially to supplements.json
    // is removed for simplification. New supplements should be managed via supplements-admin page.

    days.forEach((day) => {
      const newSchedule: Schedule = {
        id: `${Date.now()}-${day}-${selectedSupplementName.replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`,
        supplement: selectedSupplementName, // This name comes from supplements.json via getSupplements
        day,
        time,
        quantity: quantity,
        timestamp: Date.now(),
      };
      onAddSchedule(newSchedule);
    });

    setSupplement('');
    // setNewSupplement(''); // Removed as direct new supplement addition is removed
    setDays([]);
    setTime('');
    setQuantity(1);
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
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="supplement" className="text-left sm:text-right">영양제</Label>
            <div className="col-span-1 sm:col-span-3">
                <Select value={supplement} onValueChange={setSupplement}>
                  <SelectTrigger id="supplement"><SelectValue placeholder="영양제 선택" /></SelectTrigger>
                  <SelectContent><ScrollArea className="h-48">
                        {supplementsList.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
                        {/* <SelectItem value="newSupplement">새 영양제 추가</SelectItem> // Temporarily removed for simplification */}
                  </ScrollArea></SelectContent>
                </Select>
            </div>
          </div>

          {/* Input for new supplement name is removed for simplification
          {supplement === 'newSupplement' && (
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
              <Label htmlFor="newSupplement" className="text-left sm:text-right">새 이름</Label>
              <Input type="text" id="newSupplement" placeholder="새 영양제 이름 입력" value={newSupplement} onChange={(e) => setNewSupplement(e.target.value)} className="col-span-1 sm:col-span-3" />
            </div>
          )} */}

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

          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
            <Label htmlFor="time" className="text-left sm:text-right">시간</Label>
            <Input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} className="col-span-1 sm:col-span-3" />
          </div>

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
