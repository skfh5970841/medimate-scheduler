
'use client';

import React, {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ScheduleModal} from '@/components/ScheduleModal';
import {Schedule} from '@/types';
import {toast} from '@/hooks/use-toast';
import {MappingModal} from '@/components/MappingModal';
import {Trash2, Lightbulb, LightbulbOff, PlusCircle, Settings} from 'lucide-react'; // Import Settings icon

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
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false); // State for mapping modal
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
        // Try to get error message from response if possible
         let errorMsg = `HTTP 오류! 상태 코드: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
          } catch (e) {
            // Ignore if response is not JSON
          }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.state === 'on' || data.state === 'off') {
        setLedStatus(data.state);
      } else {
        setLedStatus('unknown'); // Fallback if state is invalid
      }
    } catch (error: any) {
      console.error('초기 LED 상태 가져오기 실패:', error);
      setLedStatus('unknown'); // Set to unknown on error
      // Optionally show a toast, but can be noisy if ESP32/API is often down
      // toast({
      //   title: 'LED 상태 오류',
      //   description: `초기 LED 상태를 가져오는데 실패했습니다: ${error.message}`,
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
      // Handle case where username might not be set (e.g., direct navigation)
      console.warn("사용자 이름을 localStorage에서 찾을 수 없습니다.");
    }
  }, []); // Run only once on mount

   // Fetch mapping data (for dispense check)
   const fetchMapping = async (): Promise<{ [key: string]: number }> => {
     try {
       const response = await fetch('/api/dispenser-mapping');
       if (!response.ok) {
          let errorMsg = '매핑 데이터 가져오기 실패';
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
          } catch (e) { /* ignore */ }
          throw new Error(errorMsg);
       }
       const data = await response.json().catch(() => ({})); // Handle empty or invalid JSON
       return typeof data === 'object' && data !== null ? data : {}; // Ensure it's an object
     } catch (error: any) {
       console.error("매핑 데이터 가져오기 오류:", error);
       toast({
           title: '매핑 오류',
           description: `영양제 매핑 정보를 불러오는데 실패했습니다: ${error.message || '알 수 없는 오류'}`,
           variant: 'destructive',
         });
       return {}; // Return empty mapping on error
     }
   };


  useEffect(() => {
    const checkSchedules = async () => { // Make async to potentially await API calls
      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', {weekday: 'long'}); // Use English for matching keys
      const currentTime = now.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'});

      // Fetch mapping data once per check cycle if needed
       let mappingData: { [key: string]: number } | null = null;

      for (const schedule of schedules) {
        if (schedule.day === currentDay && schedule.time === currentTime) {
          const notificationKey = `notificationShown-${schedule.id}-${now.toLocaleDateString()}`; // Unique key per schedule per day

          if (!sessionStorage.getItem(notificationKey)) { // Use sessionStorage to reset on browser close
            toast({ // Use toast for less intrusive notification
                title: '영양제 섭취 시간입니다.',
                description: `섭취해야할 영양제 종류 : ${schedule.supplement}`,
                duration: 10000, // Show for 10 seconds
            });
            sessionStorage.setItem(notificationKey, 'true');

            // --- API Call for Dispensing ---
            console.log(`[알림] ${schedule.supplement} 섭취 시간입니다. 디스펜스 API 호출 중...`);
            try {
                // Fetch mapping data only when needed
                if (mappingData === null) {
                    mappingData = await fetchMapping();
                }
                const motorNumber = mappingData[schedule.supplement];

                if (motorNumber) {
                    console.log(`[디스펜스] ${schedule.supplement} -> 모터 ${motorNumber}. 명령 전송 중...`);
                    // TODO: Replace with your actual dispense API endpoint and payload
                    // const dispenseResponse = await fetch('/api/esp32/dispense', { // hypothetical endpoint
                    //   method: 'POST',
                    //   headers: {'Content-Type': 'application/json'},
                    //   body: JSON.stringify({ motor: motorNumber }),
                    // });
                    // if (!dispenseResponse.ok) {
                    //     console.error(`[디스펜스 오류] ${schedule.supplement} (모터 ${motorNumber}) 디스펜스 실패`);
                    //     // Optionally show an error toast to the user
                    // } else {
                    //     console.log(`[디스펜스 성공] ${schedule.supplement} (모터 ${motorNumber}) 명령 전송됨`);
                    //     // Optionally show a success toast
                    // }
                } else {
                    console.warn(`[디스펜스 경고] 영양제 ${schedule.supplement}에 대한 모터 매핑을 찾을 수 없습니다. 디스펜스 불가.`);
                     toast({
                         title: '매핑 오류',
                         description: `'${schedule.supplement}'에 대한 모터 매핑이 설정되지 않았습니다.`,
                         variant: 'destructive',
                         duration: 5000,
                     });
                }

            } catch (error) {
                console.error('[디스펜스 API 오류] 디스펜스 트리거 실패:', error);
                 toast({
                     title: '디스펜스 오류',
                     description: '영양제 디스펜스 명령 전송에 실패했습니다.',
                     variant: 'destructive',
                     duration: 5000,
                 });
            }
            // --- End API Call ---
          }
        }
      }
    };

    // Check immediately on load and then every minute
    checkSchedules();
    const intervalId = setInterval(checkSchedules, 60000); // 60000ms = 1 minute

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [schedules]); // Rerun effect when schedules change

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/schedules');
      if (!response.ok) {
          let errorMsg = `HTTP 오류! 상태 코드: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
          } catch (e) { /* ignore */ }
        throw new Error(errorMsg);
      }
      const data: Schedule[] = await response.json();
       // Sort schedules by day order (optional, if API doesn't guarantee order)
       // and then by time within each day
       const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
       data.sort((a, b) => {
            const dayIndexA = dayOrder.indexOf(a.day);
            const dayIndexB = dayOrder.indexOf(b.day);
            if (dayIndexA !== dayIndexB) {
                return dayIndexA - dayIndexB;
            }
            return compareTimes(a.time, b.time);
       });

      setSchedules(data);
    } catch (error: any) {
      console.error('스케줄 가져오기 실패:', error);
      toast({
        title: '오류',
        description: `스케줄을 불러오는데 실패했습니다: ${error.message || '알 수 없는 오류'}`,
        variant: 'destructive',
      });
    }
  };

 const addSchedule = (newSchedule: Schedule) => {
    // Update state optimistically before API call for better UX
    setSchedules(prevSchedules => {
        const updated = [...prevSchedules, newSchedule];
        // Re-sort after adding
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        updated.sort((a, b) => {
            const dayIndexA = dayOrder.indexOf(a.day);
            const dayIndexB = dayOrder.indexOf(b.day);
            if (dayIndexA !== dayIndexB) {
                return dayIndexA - dayIndexB;
            }
            return compareTimes(a.time, b.time);
       });
        return updated;
    });

    // Make the API call to persist the change
    addScheduleAPI(newSchedule);
  };


  const addScheduleAPI = async (newScheduleData: Schedule) => {
    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newScheduleData), // Send full schedule object from modal submit
      });

      if (!response.ok) {
        let errorMsg = `HTTP 오류! 상태 코드: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
        } catch (e) { /* ignore */ }
         // If API fails, revert the optimistic update
         setSchedules(prevSchedules => prevSchedules.filter(s => s.id !== newScheduleData.id));
        throw new Error(errorMsg);
      }

      // API call succeeded, confirm with toast
      toast({
        title: '성공',
        description: '스케줄이 추가되었습니다.',
      });
      // No need to fetchSchedules() here because of optimistic update
      // fetchSchedules(); // Refresh list if not doing optimistic update
      // closeScheduleModal(); // Closing is handled in the modal itself on successful submit
    } catch (error: any) {
      console.error('스케줄 추가 실패:', error);
       // Ensure state is reverted if API call fails
       setSchedules(prevSchedules => prevSchedules.filter(s => s.id !== newScheduleData.id));
      toast({
        title: '오류',
        description: `스케줄 추가 실패: ${error.message || '알 수 없는 오류'}`,
        variant: 'destructive',
      });
    }
  };

 const deleteSchedule = async (id: string) => {
    // Optimistic UI update: Remove the schedule immediately
    const originalSchedules = [...schedules]; // Keep a copy for potential revert
    setSchedules(prevSchedules => prevSchedules.filter(schedule => schedule.id !== id));

    try {
        const response = await fetch(`/api/schedules/${id}`, {
            method: 'DELETE',
        });

        const result = await response.json().catch(() => ({})); // Attempt to parse JSON, default to empty object on error

        if (!response.ok) {
            // Revert optimistic update on failure
            setSchedules(originalSchedules);
            // Use message from response body if available, otherwise generate default
            const errorMessage = result.message || `HTTP 오류! 상태 코드: ${response.status}`;
            throw new Error(errorMessage);
        }

        // Success: Keep optimistic update
        toast({
            title: '성공',
            description: result.message || '스케줄이 삭제되었습니다.', // Use message from response if available
        });
        // No need to fetchSchedules here if optimistic update is kept on success

    } catch (error: any) {
        console.error('스케줄 삭제 실패:', error);
        // Ensure state is reverted if it hasn't been already
        setSchedules(originalSchedules);
        toast({
            title: '오류',
            description: `스케줄 삭제 실패: ${error.message || '알 수 없는 오류'}`,
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

       let result = { message: '' }; // Default result structure
        try {
            result = await response.json(); // Attempt to parse JSON
        } catch (e) {
            // If response is not JSON, handle accordingly
            console.warn('LED control API did not return valid JSON.');
        }

      if (!response.ok) {
        // Try to use the message from the response body if available
        throw new Error(result.message || `HTTP 오류! 상태 코드: ${response.status}`);
      }

      // On success, the optimistic update is kept.
      toast({
        title: '명령 전송 성공',
        description: result.message || `LED ${state === 'on' ? '켜기' : '끄기'} 명령이 ESP32 상태 업데이트 요청으로 전송되었습니다.`,
      });
    } catch (error: any) {
        console.error(`LED ${state} 명령 전송 실패:`, error);
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


  const openScheduleModal = () => setIsScheduleModalOpen(true);
  const closeScheduleModal = () => setIsScheduleModalOpen(false);
  const openMappingModal = () => setIsMappingModalOpen(true); // Function to open mapping modal
  const closeMappingModal = () => setIsMappingModalOpen(false); // Function to close mapping modal

  const daysOfWeek = Object.keys(daysOfWeekMap); // English keys for logic

  // Group schedules by day, then by time
  const groupedSchedules = daysOfWeek.map(day => {
    const schedulesForDay = schedules.filter(schedule => schedule.day === day);
    const times = Array.from(new Set(schedulesForDay.map(schedule => schedule.time))); // Unique times for the day
    times.sort(compareTimes); // Sort times chronologically

    return {
      day, // Keep English day for key/logic if needed
      korDay: daysOfWeekMap[day], // Korean day name for display
      times: times.map(time => ({
        time,
        supplements: schedulesForDay.filter(schedule => schedule.time === time)
                                    .map(schedule => ({
                                      id: schedule.id,
                                      supplement: schedule.supplement
                                    })) // Keep structure with ID for deletion
      }))
    };
  });

  const now = new Date();
  const currentDayEng = now.toLocaleDateString('en-US', {weekday: 'long'}); // English for matching
  const currentDayKor = daysOfWeekMap[currentDayEng] || '알 수 없는 요일'; // Korean for display, with fallback

  // Format date in YYYY년 MM월 DD일 format
    const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const currentDate = dateFormatter.format(now);


  return (
    <div className="container mx-auto p-4 max-w-7xl"> {/* Added max-w-7xl for better large screen layout */}
      <header className="flex justify-between items-center mb-6 border-b pb-4">
       <div className="text-sm text-muted-foreground flex-shrink-0 pr-4"> {/* Added flex-shrink-0 and padding */}
            {username ? `사용자: ${username}` : '로그인되지 않음'}
       </div>
        <div className="text-center flex-grow"> {/* Added flex-grow */}
          <h1 className="text-3xl font-bold mb-1">주간 영양제 스케줄</h1>
          <p className="text-lg text-muted-foreground">
            {currentDate} ({currentDayKor})
          </p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0 pl-4"> {/* Added flex-shrink-0 and padding */}
           {/* LED Control Buttons */}
           <Button
             onClick={() => controlLed('on')}
             variant={ledStatus === 'on' ? "default" : "outline"}
             size="icon"
             title="LED 켜기"
             disabled={isLedLoading || ledStatus === 'on'}
             aria-label="LED 켜기" // Accessibility
            >
             <Lightbulb className="h-5 w-5" />
           </Button>
           <Button
             onClick={() => controlLed('off')}
             variant={ledStatus === 'off' ? "default" : "outline"}
             size="icon"
             title="LED 끄기"
             disabled={isLedLoading || ledStatus === 'off'}
             aria-label="LED 끄기" // Accessibility
            >
             <LightbulbOff className="h-5 w-5" />
           </Button>
           {/* End LED Control Buttons */}
            {/* Mapping Settings Button */}
            <Button onClick={openMappingModal} variant="outline" title="영양제 매핑 설정">
                <Settings className="mr-2 h-4 w-4" /> 매핑 설정
            </Button>
            <Button onClick={openScheduleModal} title="새 스케줄 추가">
                <PlusCircle className="mr-2 h-4 w-4" /> 스케줄 추가
            </Button>
            <Button variant="outline" onClick={onLogout} title="로그아웃">
                로그아웃
            </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4"> {/* Adjusted grid for responsiveness */}
        {groupedSchedules.map(({day, korDay, times}) => (
          <Card key={day} className={`flex flex-col ${day === currentDayEng ? 'border-primary border-2 shadow-lg' : 'border'}`}> {/* Added flex flex-col */}
            <CardHeader className="bg-muted/50 p-3"> {/* Reduced padding */}
              <CardTitle className="text-center text-lg">{korDay}</CardTitle> {/* Adjusted text size */}
            </CardHeader>
            <CardContent className="pt-4 flex-grow overflow-y-auto"> {/* Added flex-grow and overflow */}
             {times.length === 0 ? (
                 <p className="text-sm text-center text-muted-foreground py-4">스케줄 없음</p>
             ) : (
                times.map(({time, supplements}) => (
                    <div key={`${day}-${time}`} className="mb-3 p-3 rounded-md bg-card border border-border shadow-sm relative group"> {/* Use bg-card, added relative group */}
                    <p className="font-semibold mb-2 text-center text-md">{time}</p> {/* Adjusted text size */}
                    <div className="flex flex-col space-y-1">
                        {supplements.map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-sm p-1 rounded hover:bg-secondary/50 group/item"> {/* Use secondary/50, added group/item */}
                            {/* Remove truncate, add min-w-0 to allow shrinking */}
                            <span className="pr-2 flex-grow min-w-0 break-words">{s.supplement}</span>
                            {/* Delete Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0 opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity" // Show on hover/focus
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent card click events if any
                                    deleteSchedule(s.id);
                                }}
                                title={`${s.supplement} (${time}) 삭제`}
                                aria-label={`${s.supplement} (${time}) 삭제`} // Accessibility
                                >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        ))}
                    </div>
                    </div>
                ))
            )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={closeScheduleModal}
        onAddSchedule={addSchedule} // Pass addSchedule directly
        />
       {/* Mapping Modal */}
       <MappingModal
         isOpen={isMappingModalOpen} // Pass state variable
         onClose={closeMappingModal} // Pass closing function
        />
    </div>
  );
};

