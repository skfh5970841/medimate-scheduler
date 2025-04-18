'use client';

import React, {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ScheduleModal} from '@/components/ScheduleModal';
import {Schedule} from '@/types';
import {toast} from '@/hooks/use-toast';
import {Trash2} from 'lucide-react';

interface SchedulePageProps {
  onLogout: () => void;
}

// Function to compare two time strings
const compareTimes = (timeA: string, timeB: string): number => {
  const [hoursA, minutesA] = timeA.split(':').map(Number);
  const [hoursB, minutesB] = timeB.split(':').map(Number);

  if (hoursA !== hoursB) {
    return hoursA - hoursB;
  }

  return minutesA - minutesB;
};

export const SchedulePage: React.FC<SchedulePageProps> = ({onLogout}) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    // Retrieve username from localStorage on component mount
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    const checkSchedules = () => {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', {weekday: 'long'});
      const currentTime = now.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'});

      schedules.forEach(schedule => {
        if (schedule.day === currentDay && schedule.time === currentTime) {
          // Check if notification has already been shown today for this schedule
          const notificationKey = `notificationShown-${schedule.id}-${now.toLocaleDateString()}`;
          if (!localStorage.getItem(notificationKey)) {
            alert(`영양제 섭취 시간입니다. 섭취해야할 영양제 종류 : ${schedule.supplement}`);
            localStorage.setItem(notificationKey, 'true'); // Set flag in local storage

            // Trigger Arduino API
            fetch('/api/arduino', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({supplement: schedule.supplement}),
            })
              .then(response => {
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log('Arduino triggered successfully');
              })
              .catch(error => {
                console.error('Failed to trigger Arduino:', error);
                toast({
                  title: 'Error',
                  description: 'Failed to trigger Arduino. Please check the connection.',
                  variant: 'destructive',
                });
              });
          }
        }
      });
    };

    // Set interval to check schedules every minute
    const intervalId = setInterval(checkSchedules, 60000);

    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, [schedules]);

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

  const deleteSchedule = async (id: string) => {
    try {
      const response = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: 'Success',
        description: 'Schedule deleted successfully.',
      });
      fetchSchedules(); // Refresh schedules after deleting
    } catch (error: any) {
      console.error('Failed to delete schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete schedule. Please try again.',
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
    let times = Array.from(new Set(schedulesForDay.map(schedule => schedule.time))); // Unique times
	times.sort(compareTimes);
    return {
      day,
      times: times.map(time => ({
        time,
        supplements: schedulesForDay.filter(schedule => schedule.time === time)
                                    .map(schedule => ({
                                      id: schedule.id,
                                      supplement: schedule.supplement
                                    }))
      }))
    };
  });

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', {weekday: 'long'});
  const currentDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
       <div>
            {username && <span className="mr-4">Logged in as: {username}</span>}
          </div>
        <div>
          <h1 className="text-2xl font-bold">Weekly Schedule</h1>
          <p className="text-muted-foreground">
            {currentDate}, {currentDay}
          </p>
        </div>
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
                <div key={`${day}-${time}`} className="mb-2 p-2 rounded-md bg-secondary flex flex-col">
                  <span>
                    {supplements.map((s, index) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span>{s.supplement}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSchedule(s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <span className="block"> - {time}</span>
                  </span>
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
