'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { toast } from "@/hooks/use-toast"; // Import toast for notifications
import type { Supplement } from "@/services/supplements"; // Import Supplement type

interface Mapping {
  [supplementName: string]: number;
}

interface MappingModalProps {
  isOpen: boolean; // Renamed from 'open' for clarity
  onClose: () => void; // Renamed from 'setOpen' for clarity
}

export function MappingModal({ isOpen, onClose }: MappingModalProps) {
  const [allSupplements, setAllSupplements] = useState<Supplement[]>([]); // State for all available supplements
  const [currentMapping, setCurrentMapping] = useState<Mapping>({});
  const [selectedSupplement, setSelectedSupplement] = useState<string>(""); // Store supplement name
  const [selectedMotor, setSelectedMotor] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false); // Add loading state
  const [isDeleting, setIsDeleting] = useState(false); // Add deleting state

  const motorNumbers = [1, 2, 3, 4, 5, 6, 7, 8]; // Define motor numbers

  // Fetch all supplements and existing mapping when the modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return; // Only fetch when modal is open

      // 1. Fetch all supplements from localStorage
      try {
        const storedSupplements = localStorage.getItem('supplements');
        const parsedSupplements: Supplement[] = storedSupplements ? JSON.parse(storedSupplements) : [];
         // Ensure default supplements are included if none found or error occurs
         if (parsedSupplements.length === 0) {
            // Add default if local storage is empty (can refine this logic)
            const defaultSupplements = [
              {id: 'vitamin-d', name: '비타민 D'},
              {id: 'vitamin-c', name: '비타민 C'},
              {id: 'calcium', name: '칼슘'},
            ];
            setAllSupplements(defaultSupplements);
             // Optionally save defaults back to localStorage
            localStorage.setItem('supplements', JSON.stringify(defaultSupplements));
         } else {
             setAllSupplements(parsedSupplements);
         }

      } catch (error) {
        console.error('Error fetching supplements from local storage:', error);
         const defaultSupplements = [
            {id: 'vitamin-d', name: '비타민 D'},
            {id: 'vitamin-c', name: '비타민 C'},
            {id: 'calcium', name: '칼슘'},
         ];
         setAllSupplements(defaultSupplements); // Fallback to defaults
        toast({
            title: '오류',
            description: '영양제 목록을 불러오는데 실패했습니다.',
            variant: 'destructive',
          });
      }

      // 2. Fetch existing mapping from API
      try {
        const response = await fetch("/api/dispenser-mapping");
        if (!response.ok) {
          throw new Error("Failed to fetch mapping data");
        }
        const mapping: Mapping = await response.json();
        setCurrentMapping(mapping);
      } catch (error) {
        console.error("Error fetching mapping data:", error);
        toast({
            title: '오류',
            description: '영양제 매핑 정보를 불러오는데 실패했습니다.',
            variant: 'destructive',
          });
        setCurrentMapping({});
      }

      // Reset selections when modal opens
      setSelectedSupplement("");
      setSelectedMotor("");
    };

    fetchData();
  }, [isOpen]); // Re-fetch when modal opens

  // Update motor selection when supplement changes
   useEffect(() => {
    if (selectedSupplement && currentMapping[selectedSupplement]) {
      setSelectedMotor(currentMapping[selectedSupplement].toString());
    } else {
      setSelectedMotor(""); // Reset motor if supplement is not mapped or cleared
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

    try {
      const response = await fetch("/api/dispenser-mapping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Send only the selected mapping to update/add
          [selectedSupplement]: parseInt(selectedMotor),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || "Failed to update mapping");
      }

      // Update local mapping state immediately for responsiveness
       setCurrentMapping(prev => ({
            ...prev,
            [selectedSupplement]: parseInt(selectedMotor),
       }));


      toast({
        title: '성공',
        description: '영양제 매핑이 저장되었습니다.',
      });
      onClose(); // Close modal on success
    } catch (error: any) {
      console.error("Error updating mapping:", error);
      toast({
        title: '오류',
        description: `매핑 저장 실패: ${error.message}`,
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
    // Check if the supplement actually has a mapping to delete
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
        // Correctly use query parameter for DELETE request
        const response = await fetch(`/api/dispenser-mapping?supplementName=${encodeURIComponent(selectedSupplement)}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || "Failed to delete mapping");
        }

        toast({
            title: '성공',
            description: `영양제 '${selectedSupplement}' 매핑이 삭제되었습니다.`,
        });
        // Update local mapping state immediately
        setCurrentMapping(prev => {
            const newMapping = { ...prev };
            delete newMapping[selectedSupplement];
            return newMapping;
        });
        // No need to update allSupplements list here
        setSelectedSupplement(""); // Clear selection
        setSelectedMotor(""); // Clear motor selection as well
        // Optionally close modal: onClose();

    } catch (error: any) {
      console.error("Error deleting mapping:", error);
      toast({
          title: '오류',
          description: `매핑 삭제 실패: ${error.message}`,
          variant: 'destructive',
      });
    } finally {
        setIsDeleting(false);
    }
  };

  return (
    // Use onOpenChange for better control over dialog state
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>영양제 매핑 설정</DialogTitle>
          <DialogDescription>
            영양제와 디스펜서 모터 번호를 연결합니다.
          </DialogDescription>
        </DialogHeader>
        {/* Form for submitting mapping */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="supplement">영양제 이름</Label>
            <Select
              value={selectedSupplement} // Controlled component using supplement name
              onValueChange={setSelectedSupplement}
            >
              <SelectTrigger id="supplement">
                <SelectValue placeholder="영양제 선택" />
              </SelectTrigger>
              <SelectContent>
                {allSupplements.length > 0 ? (
                  // Use allSupplements list here
                  allSupplements.map((s) => (
                    // Use supplement name as the value
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-supplements" disabled>
                    등록된 영양제 없음 (스케줄 추가 시 생성됨)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="motor">모터 번호</Label>
            <Select
              value={selectedMotor} // Controlled component
              onValueChange={setSelectedMotor}
              disabled={!selectedSupplement} // Disable motor selection if no supplement is chosen
            >
              <SelectTrigger id="motor">
                <SelectValue placeholder="모터 선택" />
              </SelectTrigger>
              <SelectContent>
                {motorNumbers.map((number) => (
                  <SelectItem key={number} value={number.toString()}>
                    {number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Buttons moved outside the form or handle type="button" */}
           <div className="flex justify-end gap-2 pt-4">
             <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting || isDeleting}>
               취소
             </Button>
             <Button
                type="button"
                onClick={handleDelete}
                variant="destructive"
                // Disable if no supplement selected OR if the selected one has no mapping OR during actions
                disabled={!selectedSupplement || !(selectedSupplement in currentMapping) || isSubmitting || isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </Button>
            <Button type="submit" disabled={!selectedSupplement || !selectedMotor || isSubmitting || isDeleting}>
               {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </form>


      </DialogContent>
    </Dialog>
  );
}
