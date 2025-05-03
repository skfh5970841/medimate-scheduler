
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import type { Supplement } from "@/services/supplements";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react"; // Import icons


interface Mapping {
  [supplementName: string]: number;
}

interface MappingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MappingModal({ isOpen, onClose }: MappingModalProps) {
  const [allSupplements, setAllSupplements] = useState<Supplement[]>([]);
  const [currentMapping, setCurrentMapping] = useState<Mapping>({});
  const [selectedSupplement, setSelectedSupplement] = useState<string>("");
  const [selectedMotor, setSelectedMotor] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const motorNumbers = [1, 2, 3, 4, 5, 6, 7, 8];

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      setIsLoading(true);

      setSelectedSupplement("");
      setSelectedMotor("");
      setCurrentMapping({});
      setAllSupplements([]);

      try {
        const storedSupplements = localStorage.getItem('supplements');
        const parsedSupplements: Supplement[] = storedSupplements ? JSON.parse(storedSupplements) : [];
         if (parsedSupplements.length === 0) {
            const defaultSupplements = [
              {id: 'vitamin-d', name: '비타민 D'},
              {id: 'vitamin-c', name: '비타민 C'},
              {id: 'calcium', name: '칼슘'},
            ];
            setAllSupplements(defaultSupplements);
            localStorage.setItem('supplements', JSON.stringify(defaultSupplements));
         } else {
             setAllSupplements(parsedSupplements);
         }

      } catch (error) {
        console.error('로컬 저장소에서 영양제 목록 가져오기 오류:', error);
         const defaultSupplements = [
            {id: 'vitamin-d', name: '비타민 D'},
            {id: 'vitamin-c', name: '비타민 C'},
            {id: 'calcium', name: '칼슘'},
         ];
         setAllSupplements(defaultSupplements);
        toast({
            title: '오류',
            description: '영양제 목록을 불러오는데 실패했습니다.',
            variant: 'destructive',
          });
      }

      try {
        const response = await fetch("/api/dispenser-mapping");
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMsg = data.message || `HTTP 오류! 상태 코드: ${response.status}`;
            throw new Error(errorMsg);
        }

        setCurrentMapping(data);
      } catch (error: any) {
        console.error("매핑 데이터 가져오기 오류:", error);
        toast({
            title: '오류',
            description: `영양제 매핑 정보를 불러오는데 실패했습니다: ${error.message || '알 수 없는 오류'}`,
            variant: 'destructive',
          });
        setCurrentMapping({});
      } finally {
          setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

   useEffect(() => {
    if (selectedSupplement && currentMapping[selectedSupplement]) {
      setSelectedMotor(currentMapping[selectedSupplement].toString());
    } else {
      setSelectedMotor("");
    }
  }, [selectedSupplement, currentMapping]);


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSupplement || !selectedMotor) {
      toast({
        title: '입력 오류',
        description: '영양제와 모터 번호를 모두 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);

    const motorNumber = parseInt(selectedMotor);

    const existingSupplementForMotor = Object.entries(currentMapping).find(
        ([sup, motor]) => motor === motorNumber && sup !== selectedSupplement
    );

    if (existingSupplementForMotor) {
        toast({
            title: '매핑 충돌',
            description: `모터 ${motorNumber}번은 이미 '${existingSupplementForMotor[0]}'에 할당되어 있습니다.`,
            variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
    }


    try {
      const response = await fetch("/api/dispenser-mapping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [selectedSupplement]: motorNumber,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = result.message || `HTTP 오류! 상태 코드: ${response.status}`;
        throw new Error(errorMsg);
      }

       setCurrentMapping(prev => ({
            ...prev,
            [selectedSupplement]: motorNumber,
       }));


      toast({
        title: '성공',
        description: '영양제 매핑이 저장되었습니다.',
      });
    } catch (error: any) {
      console.error("매핑 업데이트 오류:", error);
      toast({
        title: '오류',
        description: `매핑 저장 실패: ${error.message || '알 수 없는 오류'}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplement) {
       toast({
         title: '선택 오류',
         description: '삭제할 영양제를 선택해주세요.',
         variant: 'destructive',
       });
      return;
    }
     if (!(selectedSupplement in currentMapping)) {
       toast({
         title: '매핑 없음',
         description: `선택한 영양제 '${selectedSupplement}'에 대한 매핑이 없습니다.`,
         variant: 'destructive',
       });
       return;
     }


    setIsDeleting(true);
    try {
        const response = await fetch(`/api/dispenser-mapping?supplementName=${encodeURIComponent(selectedSupplement)}`, {
            method: 'DELETE',
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMsg = result.message || `HTTP 오류! 상태 코드: ${response.status}`;
            throw new Error(errorMsg);
        }

        toast({
            title: '성공',
            description: result.message || `영양제 '${selectedSupplement}' 매핑이 삭제되었습니다.`,
        });
        setCurrentMapping(prev => {
            const newMapping = { ...prev };
            delete newMapping[selectedSupplement];
            return newMapping;
        });
        setSelectedSupplement("");
        setSelectedMotor("");

    } catch (error: any) {
      console.error("매핑 삭제 오류:", error);
      toast({
          title: '오류',
          description: `매핑 삭제 실패: ${error.message || '알 수 없는 오류'}`,
          variant: 'destructive',
      });
    } finally {
        setIsDeleting(false);
    }
  };

  const handleResetMapping = async () => {
    setIsResetting(true);
    try {
        const response = await fetch('/api/dispenser-mapping', {
            method: 'DELETE',
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            const errorMsg = result.message || `HTTP 오류! 상태 코드: ${response.status}`;
            throw new Error(errorMsg);
        }

        toast({
            title: '성공',
            description: result.message || '모든 영양제 매핑이 초기화되었습니다.',
        });
        setCurrentMapping({});
        setSelectedSupplement("");
        setSelectedMotor("");

    } catch (error: any) {
        console.error("매핑 초기화 오류:", error);
        toast({
            title: '오류',
            description: `매핑 초기화 실패: ${error.message || '알 수 없는 오류'}`,
            variant: 'destructive',
        });
    } finally {
        setIsResetting(false);
    }
 };


  const usedMotors = Object.values(currentMapping);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* Adjust content width for mobile */}
      <DialogContent className="w-full max-w-md sm:max-w-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>영양제 매핑 설정</DialogTitle>
          <DialogDescription>
            영양제와 디스펜서 모터 번호를 연결합니다.
          </DialogDescription>
        </DialogHeader>

        {/* Current Mapping Display */}
        <div className="mt-4 mb-2">
            <h4 className="mb-2 text-sm font-medium">현재 매핑 상태</h4>
            <Separator className="mb-3"/>
             {isLoading ? (
                <div className="flex justify-center items-center text-sm text-muted-foreground py-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    매핑 정보 로딩 중...
                </div>
             ) : (
                 <ScrollArea className="h-24 rounded-md border p-2">
                     {Object.keys(currentMapping).length > 0 ? (
                        <ul className="space-y-1 text-sm text-muted-foreground">
                            {Object.entries(currentMapping)
                                .sort(([, motorA], [, motorB]) => motorA - motorB)
                                .map(([supplement, motor]) => (
                                <li key={supplement} className="flex justify-between items-center">
                                    <span className="truncate pr-2">{supplement}</span> {/* Add truncate */}
                                    <span className="flex-shrink-0">모터 {motor}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-center text-muted-foreground py-4">매핑된 영양제 없음</p>
                    )}
                 </ScrollArea>
             )}
             <Separator className="mt-3"/>
        </div>

        {/* Mapping Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Responsive grid for form inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="supplement">영양제 이름</Label>
                <Select
                  value={selectedSupplement}
                  onValueChange={setSelectedSupplement}
                  disabled={isLoading}
                >
                  <SelectTrigger id="supplement">
                    <SelectValue placeholder="영양제 선택" />
                  </SelectTrigger>
                  <SelectContent>
                     <ScrollArea className="h-48"> {/* Add ScrollArea */}
                        {allSupplements.length > 0 ? (
                          allSupplements.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-supplements" disabled>
                            등록된 영양제 없음
                          </SelectItem>
                        )}
                     </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="motor">모터 번호</Label>
                <Select
                  value={selectedMotor}
                  onValueChange={setSelectedMotor}
                  disabled={!selectedSupplement || isLoading}
                >
                  <SelectTrigger id="motor">
                    <SelectValue placeholder="모터 선택" />
                  </SelectTrigger>
                  <SelectContent>
                     <ScrollArea className="h-48"> {/* Add ScrollArea */}
                        {motorNumbers.map((number) => {
                            const isUsedByOther = Object.entries(currentMapping).some(
                                ([sup, motor]) => motor === number && sup !== selectedSupplement
                            );
                            return (
                                <SelectItem
                                    key={number}
                                    value={number.toString()}
                                    disabled={isUsedByOther}
                                >
                                   {number} {isUsedByOther ? '(사용 중)' : ''}
                                </SelectItem>
                            );
                         })}
                     </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
          </div>

          {/* Responsive Footer Buttons */}
           <DialogFooter className="pt-4 flex flex-col-reverse sm:flex-row sm:justify-between gap-2">

             {/* Left-aligned Reset (Top on Mobile) */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    variant="destructive"
                    className="w-full sm:w-auto sm:mr-auto"
                    disabled={isLoading || isSubmitting || isDeleting || isResetting || Object.keys(currentMapping).length === 0}
                    >
                    {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    전체 초기화
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>매핑 초기화 확인</AlertDialogTitle>
                  <AlertDialogDescription>
                    정말로 모든 영양제 모터 매핑을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetMapping} disabled={isResetting}>
                     {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                     초기화
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

             {/* Right-aligned Group (Bottom on Mobile) */}
            <div className="flex flex-col-reverse sm:flex-row sm:space-x-2 gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || isSubmitting || isDeleting || isResetting} className="w-full sm:w-auto">
                    닫기
                </Button>
                <Button
                    type="button"
                    onClick={handleDelete}
                    variant="destructive"
                    disabled={isLoading || !selectedSupplement || !(selectedSupplement in currentMapping) || isSubmitting || isDeleting || isResetting}
                    className="w-full sm:w-auto"
                >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    선택 삭제
                </Button>
                <Button type="submit" disabled={isLoading || !selectedSupplement || !selectedMotor || isSubmitting || isDeleting || isResetting} className="w-full sm:w-auto">
                   {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                   저장
                </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
