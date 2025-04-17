'use client';

import React, {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ScheduleModal} from '@/components/ScheduleModal';
import {Schedule} from '@/types';
import {toast} from '@/hooks/use-toast';

interface SchedulePageProps {
  onLogout: () => void;
}

export const SchedulePage: React.FC<SchedulePageProps> = ({onLogout}) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/schedules');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Schedule[] = await response.json();
      setSchedules(data);
    } catch (error: any) {
      console.error('Failed to fetch schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load schedules. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const addSchedule = async (newSchedule: Schedule) => {
    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSchedule),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: 'Success',
        description: 'Schedule added successfully.',
      });
      fetchSchedules(); // Refresh schedules after adding
    } catch (error: any) {
      console.error('Failed to add schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to add schedule. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Group schedules by day and time
  const groupedSchedules = daysOfWeek.map(day => {
    const schedulesForDay = schedules.filter(schedule => schedule.day === day);
    const times = Array.from(new Set(schedulesForDay.map(schedule => schedule.time))); // Unique times
    return {
      day,
      times: times.map(time => ({
        time,
        supplements: schedulesForDay.filter(schedule => schedule.time === time)
                                    .map(schedule => schedule.supplement)
      }))
    };
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Weekly Schedule</h1>
        <div>
          <Button onClick={openModal} className="mr-2">
            Add Schedule
          </Button>
          <Button variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {groupedSchedules.map(({day, times}) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle>{day}</CardTitle>
            </CardHeader>
            <CardContent>
              {times.map(({time, supplements}) => (
                <div key={`${day}-${time}`} className="mb-2 p-2 rounded-md bg-secondary">
                  {supplements.join(', ')} - {time}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <ScheduleModal isOpen={isModalOpen} onClose={closeModal} onAddSchedule={addSchedule} />
    </div>
  );
};
