'use client';

import React, {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ScheduleModal} from '@/components/ScheduleModal';
import {Schedule} from '@/types';
import {toast} from '@/hooks/use-toast';
import {Trash2, Lightbulb, LightbulbOff, PlusCircle} from 'lucide-react'; // Import LED icons and PlusCircle

interface SchedulePageProps {
  onLogout: () => void;
}

// Function to compare two time strings (HH:MM format)
const compareTimes = (timeA: string, timeB: string): number => {
    const [hoursA, minutesA] = timeA.split(':').map(Number);
    const [hoursB, minutesB] = timeB.split(':').map(Number);

    if (hoursA !== hoursB) {
        return hoursA - hoursB;
    }

    return minutesA - minutesB;
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

export const SchedulePage: React.FC<SchedulePageProps> = ({onLogout}) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [ledStatus, setLedStatus] = useState<'on' | 'off' | 'unknown'>('unknown'); // Track LED status
  const [isLedLoading, setIsLedLoading] = useState<boolean>(false); // Track loading state for LED buttons

  // Function to fetch the current LED status from the backend
  const fetchLedStatus = async () => {
    try {
      // We assume the GET route now just returns the *desired* state
      // as set by the POST route. The actual ESP32 state isn't directly known here.
      // A more robust solution might involve the ESP32 reporting its actual state
      // back to a different endpoint, which the frontend could then query.
      // For now, we optimistically assume the last command sent will be the state.
      // Let's initialize based on what the GET returns (the last set command).
      setIsLedLoading(true);
      const response = await fetch('/api/esp32/led'); // GET request
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.state === 'on' || data.state === 'off') {
        setLedStatus(data.state);
      } else {
        setLedStatus('unknown'); // Fallback if state is invalid
      }
    } catch (error) {
      console.error('Failed to fetch initial LED status:', error);
      setLedStatus('unknown'); // Set to unknown on error
      // toast({
      //   title: 'LED 상태 오류',
      //   description: '초기 LED 상태를 가져오는데 실패했습니다.',
      //   variant: 'destructive',
      // });
    } finally {
        setIsLedLoading(false);
    }
  };


  useEffect(() => {
    fetchSchedules();
    fetchLedStatus(); // Fetch initial LED status when component mounts
    // Retrieve username from localStorage
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      console.warn("Username not found in localStorage.");
    }
  }, []); // Run only once on mount

  useEffect(() => {
    const checkSchedules = () => {
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', {weekday: 'long'}); // Use English for matching keys
      const currentTime = now.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'});

      schedules.forEach(schedule => {
        if (schedule.day === currentDay && schedule.time === currentTime) {
          const notificationKey = `notificationShown-${schedule.id}-${now.toLocaleDateString()}`; // Unique key per schedule per day

          if (!sessionStorage.getItem(notificationKey)) { // Use sessionStorage to reset on browser close
            toast({ // Use toast for less intrusive notification
                title: '영양제 섭취 시간',
                description: `섭취해야 할 영양제: ${schedule.supplement}`,
                duration: 10000, // Show for 10 seconds
            });
            sessionStorage.setItem(notificationKey, 'true');

            // Trigger ESP32 API for supplement dispensing
            // Consider if you need a separate API or if LED control implies dispensing
            console.log(`Dispensing ${schedule.supplement}`);
            // Example:
            // fetch('/api/esp32/dispense', {
            //   method: 'POST',
            //   headers: {'Content-Type': 'application/json'},
            //   body: JSON.stringify({ supplement: schedule.supplement }),
            // }).then(...).catch(...);
          }
        }
      });
    };

    // Check immediately on load and then every minute
    checkSchedules();
    const intervalId = setInterval(checkSchedules, 60000); // 60000ms = 1 minute

    return () => clearInterval(intervalId); // Cleanup interval on unmount
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
        title: '오류',
        description: '스케줄을 불러오는데 실패했습니다.',
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
        const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
        throw new Error(`HTTP error! status: ${response.status} - ${errorData.message}`);
      }

      toast({
        title: '성공',
        description: '스케줄이 추가되었습니다.',
      });
      fetchSchedules(); // Refresh list
    } catch (error: any) {
      console.error('Failed to add schedule:', error);
      toast({
        title: '오류',
        description: `스케줄 추가 실패: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
        // Optimistic UI update: Remove the schedule immediately
        setSchedules(prevSchedules => prevSchedules.filter(schedule => schedule.id !== id));

        const response = await fetch(`/api/schedules/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
            // Revert optimistic update on failure
            fetchSchedules(); // Refetch to get the correct state
            throw new Error(`HTTP error! status: ${response.status} - ${errorData.message}`);
        }


        toast({
            title: '성공',
            description: '스케줄이 삭제되었습니다.',
        });
        // No need to fetchSchedules here if optimistic update is kept on success
    } catch (error: any) {
        console.error('Failed to delete schedule:', error);
        toast({
            title: '오류',
            description: `스케줄 삭제 실패: ${error.message}`,
            variant: 'destructive',
        });
    }
};

  // --- LED Control ---
  const controlLed = async (state: 'on' | 'off') => {
    const previousStatus = ledStatus; // Store previous status for potential revert
    setIsLedLoading(true);
    setLedStatus(state); // Optimistic UI update

    try {
      const response = await fetch('/api/esp32/led', { // Correctly calls the POST endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state }),
      });

      const result = await response.json(); // Attempt to parse JSON regardless of status

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      // On success, the optimistic update is kept.
      toast({
        title: '명령 전송 성공',
        description: `LED ${state === 'on' ? '켜기' : '끄기'} 명령이 ESP32로 전송되었습니다.`,
      });
    } catch (error: any) {
        console.error(`Failed to send LED ${state} command:`, error);
        setLedStatus(previousStatus); // Revert optimistic update on failure
        toast({
          title: '명령 전송 오류',
          description: error.message || `LED ${state === 'on' ? '켜기' : '끄기'} 명령 전송 실패. ESP32 연결 또는 API 상태를 확인하세요.`,
          variant: 'destructive',
        });
    } finally {
        setIsLedLoading(false);
    }
  };
  // --- End LED Control ---


  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const daysOfWeek = Object.keys(daysOfWeekMap); // English keys for logic

  // Group schedules by day, then by time
  const groupedSchedules = daysOfWeek.map(day => {
    const schedulesForDay = schedules.filter(schedule => schedule.day === day);
    const times = Array.from(new Set(schedulesForDay.map(schedule => schedule.time))); // Unique times for the day
    times.sort(compareTimes); // Sort times chronologically

    return {
      day, // Keep English day for key/logic if needed
      times: times.map(time => ({
        time,
        supplements: schedulesForDay.filter(schedule => schedule.time === time)
                                    .map(schedule => ({
                                      id: schedule.id,
                                      supplement: schedule.supplement
                                    })) // Keep original schedule structure for deletion
      }))
    };
  });

  const now = new Date();
  const currentDayEng = now.toLocaleDateString('en-US', {weekday: 'long'}); // English for matching
  const currentDayKor = daysOfWeekMap[currentDayEng]; // Korean for display

  // Format date in YYYY년 MM월 DD일 format
    const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const currentDate = dateFormatter.format(now);


  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
       <div className="text-sm text-muted-foreground">
            {username ? `로그인 사용자: ${username}` : '로그인되지 않음'}
       </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-1">주간 영양제 스케줄</h1>
          <p className="text-lg text-muted-foreground">
            {currentDate} ({currentDayKor})
          </p>
        </div>
        <div className="flex items-center space-x-2">
           {/* LED Control Buttons */}
           <Button onClick={() => controlLed('on')} variant={ledStatus === 'on' ? "default" : "outline"} size="icon" title="LED 켜기 명령" disabled={isLedLoading || ledStatus === 'on'}>
             <Lightbulb className="h-5 w-5" />
           </Button>
           <Button onClick={() => controlLed('off')} variant={ledStatus === 'off' ? "default" : "outline"} size="icon" title="LED 끄기 명령" disabled={isLedLoading || ledStatus === 'off'}>
             <LightbulbOff className="h-5 w-5" />
           </Button>
           {/* End LED Control Buttons */}
          <Button onClick={openModal}>
            <PlusCircle className="mr-2 h-4 w-4" /> 스케줄 추가
          </Button>
          <Button variant="outline" onClick={onLogout}>
            로그아웃
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {groupedSchedules.map(({day, times}) => (
          <Card key={day} className={`${day === currentDayEng ? 'border-primary border-2 shadow-lg' : 'border'}`}>
            <CardHeader className="bg-muted/50">
              {/* Display Korean day name */}
              <CardTitle className="text-center">{daysOfWeekMap[day]}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
             {times.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">스케줄 없음</p>}
              {times.map(({time, supplements}) => (
                <div key={`${day}-${time}`} className="mb-3 p-3 rounded-md bg-secondary border border-border shadow-sm">
                  <p className="font-semibold mb-2 text-center text-lg">{time}</p>
                  <div className="flex flex-col space-y-1">
                    {supplements.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm p-1 rounded hover:bg-background">
                        <span className="truncate pr-2">{s.supplement}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => deleteSchedule(s.id)}
                          title={`${s.supplement} (${time}) 삭제`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
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

