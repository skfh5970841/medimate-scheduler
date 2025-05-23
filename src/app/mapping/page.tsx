'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast'; // Assuming use-toast hook is used as in SchedulePage
import { PlusCircle, Edit3, Trash2, RefreshCw } from 'lucide-react'; // Icons

interface DispenserMapping {
  [key: string]: number;
}

interface Supplement {
  id: string;
  name: string;
}

export default function MappingPage() {
  const [mappings, setMappings] = useState<DispenserMapping>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for adding/editing a mapping
  const [availableSupplements, setAvailableSupplements] = useState<Supplement[]>([]);
  const [selectedSupplement, setSelectedSupplement] = useState<string>('');
  const [motorNumber, setMotorNumber] = useState<string>('');
  const [isEditing, setIsEditing] = useState<string | null>(null); // Stores the key of the mapping being edited
  const [editMotorNumber, setEditMotorNumber] = useState<string>('');

  const fetchMappings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dispenser-mapping');
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.message || `매핑 정보를 불러오는데 실패했습니다: ${response.status}`);
      }
      const data: DispenserMapping = await response.json();
      setMappings(data);
    } catch (err: any) {
      console.error("Fetch mapping error:", err);
      setError(err.message || '매핑 정보를 불러오는 중 오류가 발생했습니다.');
      toast({
        title: '오류',
        description: err.message || '매핑 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  }, []);

  const fetchSupplements = useCallback(async () => {
    try {
      // Assuming getSupplements function is adapted to be callable from client-side 
      // or there's an API endpoint for supplements.
      // For now, let's mock or use a direct fetch if supplements.json is in public folder or an API exists
      // This part needs to align with how `getSupplements` in `supplements.ts` is actually exposed/works.
      // If `supplements.json` is in `src/data` and not served, we need an API route for it.
      // Let's create a temporary API route for supplements for this example.
      const response = await fetch('/api/supplements'); // We'll need to create this API route
      if(!response.ok) {
        throw new Error('영양제 목록을 불러오는데 실패했습니다.');
      }
      const data: Supplement[] = await response.json();
      setAvailableSupplements(data);
      if (data.length > 0) {
        // Find first unmapped supplement or default to first one if all mapped
        const firstUnmapped = data.find(s => !(s.name in mappings));
        setSelectedSupplement(firstUnmapped ? firstUnmapped.name : data[0].name);
      }
    } catch (err:any) {
      console.error("Fetch supplements error:", err);
      toast({
        title: '오류',
        description: '사용 가능한 영양제 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  }, [mappings]); // Add mappings as dependency

  useEffect(() => {
    fetchMappings();
    fetchSupplements(); // Fetch supplements for the add/edit form
  }, [fetchMappings, fetchSupplements]);

  // Handler to add or update a mapping
  const handleSaveMapping = async () => {
    if (isEditing) { // Update existing mapping
      if (!editMotorNumber || isNaN(parseInt(editMotorNumber)) || parseInt(editMotorNumber) <=0 ) {
        toast({ title: '오류', description: '유효한 모터 번호(0보다 큰 정수)를 입력해주세요.', variant: 'destructive' });
        return;
      }
      const supplementKey = isEditing;
      const motorNum = parseInt(editMotorNumber);

      // Check if new motor number is already used by another supplement
      const existingSupplementForMotor = Object.entries(mappings).find(
        ([sup, motor]) => motor === motorNum && sup !== supplementKey
      );
      if (existingSupplementForMotor) {
        toast({ title: '충돌 오류', description: `모터 ${motorNum}번은 이미 '${existingSupplementForMotor[0]}'에 할당되어 있습니다.`, variant: 'destructive' });
        return;
      }

      const updatedMapping = { [supplementKey]: motorNum };

      try {
        const response = await fetch('/api/dispenser-mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedMapping),
        });
        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(errorResult.message || '매핑 업데이트 실패');
        }
        toast({ title: '성공', description: `'${supplementKey}'의 모터 번호가 ${editMotorNumber}(으)로 업데이트되었습니다.` });
        setMappings(prev => ({ ...prev, ...updatedMapping }));
        setIsEditing(null);
        setEditMotorNumber('');
      } catch (err: any) {
        console.error("Update mapping error:", err);
        toast({ title: '오류', description: err.message || '매핑 업데이트 중 오류 발생', variant: 'destructive' });
      }

    } else { // Add new mapping
      if (!selectedSupplement || !motorNumber || isNaN(parseInt(motorNumber)) || parseInt(motorNumber) <=0) {
        toast({ title: '오류', description: '영양제를 선택하고 유효한 모터 번호(0보다 큰 정수)를 입력해주세요.', variant: 'destructive' });
        return;
      }
      if (mappings[selectedSupplement] !== undefined) {
        toast({ title: '오류', description: `'${selectedSupplement}'은(는) 이미 매핑되어 있습니다. 기존 항목을 수정해주세요.`, variant: 'destructive' });
        return;
      }
      const motorNum = parseInt(motorNumber);
      // Check if motor number is already used
      const existingSupplementForMotor = Object.entries(mappings).find(
        ([, motor]) => motor === motorNum
      );
      if (existingSupplementForMotor) {
        toast({ title: '충돌 오류', description: `모터 ${motorNum}번은 이미 '${existingSupplementForMotor[0]}'에 할당되어 있습니다.`, variant: 'destructive' });
        return;
      }

      const newMapping = { [selectedSupplement]: motorNum };

      try {
        const response = await fetch('/api/dispenser-mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMapping),
        });
        if (!response.ok) {
          const errorResult = await response.json();
          throw new Error(errorResult.message || '매핑 추가 실패');
        }
        toast({ title: '성공', description: `'${selectedSupplement}'이(가) 모터 ${motorNumber}에 할당되었습니다.` });
        setMappings(prev => ({ ...prev, ...newMapping }));
        // Reset to first unmapped or first available supplement
        const firstUnmapped = availableSupplements.find(s => !(s.name in {...mappings, ...newMapping}));
        setSelectedSupplement(firstUnmapped ? firstUnmapped.name : (availableSupplements.length > 0 ? availableSupplements[0].name : ''));
        setMotorNumber('');
      } catch (err: any) {
        console.error("Add mapping error:", err);
        toast({ title: '오류', description: err.message || '매핑 추가 중 오류 발생', variant: 'destructive' });
      }
    }
  };

  const handleDeleteMapping = async (supplementName: string) => {
    if (!confirm(`'${supplementName}' 매핑을 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(`/api/dispenser-mapping?supplementName=${encodeURIComponent(supplementName)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.message || '매핑 삭제 실패');
      }
      toast({ title: '성공', description: `'${supplementName}' 매핑이 삭제되었습니다.` });
      const newMappings = { ...mappings };
      delete newMappings[supplementName];
      setMappings(newMappings);
      if (isEditing === supplementName) {
        setIsEditing(null);
        setEditMotorNumber('');
      }
       // After deleting, if the selectedSupplement was the one deleted, reset it
      if (selectedSupplement === supplementName) {
        const firstUnmapped = availableSupplements.find(s => !(s.name in newMappings));
        setSelectedSupplement(firstUnmapped ? firstUnmapped.name : (availableSupplements.length > 0 ? availableSupplements[0].name : ''));
      }
    } catch (err: any) {
      console.error("Delete mapping error:", err);
      toast({ title: '오류', description: err.message || '매핑 삭제 중 오류 발생', variant: 'destructive' });
    }
  };

  const handleEditClick = (supplementName: string, currentMotorNumber: number) => {
    setIsEditing(supplementName);
    setEditMotorNumber(String(currentMotorNumber));
    // Scroll to the edit form or highlight it if it's a modal/separate section
  };

  const supplementOptions = availableSupplements.map(s => ({
    value: s.name,
    label: s.name,
    disabled: mappings[s.name] !== undefined && s.name !== isEditing // Disable if already mapped and not editing it
  }));


  if (isLoading && Object.keys(mappings).length === 0 && availableSupplements.length === 0) return <div className="p-4 text-center">매핑 정보를 불러오는 중...</div>;

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6 shadow-lg rounded-xl">
        <CardHeader className="bg-muted/30 rounded-t-xl">
          <CardTitle className="text-lg sm:text-xl">
            {isEditing 
              ? `'${isEditing}' 매핑 수정` 
              : '새 영양제 매핑 추가'}
          </CardTitle>
          <CardDescription>
            {isEditing 
              ? `모터 번호를 수정합니다. 다른 영양제에 이미 할당된 번호는 사용할 수 없습니다.` 
              : '목록에서 영양제를 선택하고 사용하지 않는 모터 번호를 할당하세요.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {isEditing ? (
            <div>
              <Label htmlFor="editMotorNumber" className="block text-sm font-medium mb-1">모터 번호 (1 이상의 정수)</Label>
              <Input 
                id="editMotorNumber"
                type="number" 
                value={editMotorNumber} 
                onChange={(e) => setEditMotorNumber(e.target.value)} 
                placeholder="모터 번호 (예: 1)"
                className="w-full"
                min="1"
              />
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="supplementSelect" className="block text-sm font-medium mb-1">영양제 선택 (매핑되지 않은 영양제)</Label>
                <select 
                  id="supplementSelect"
                  value={selectedSupplement} 
                  onChange={(e) => setSelectedSupplement(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={availableSupplements.length === 0 || availableSupplements.every(s => s.disabled)}
                >
                  {availableSupplements.length === 0 && <option value="">로딩 중...</option>}
                  {availableSupplements.every(s => s.disabled) && selectedSupplement === '' && <option value="">모든 영양제가 매핑됨</option>}
                  {supplementOptions.map(opt => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label} {opt.disabled ? '(이미 매핑됨)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="motorNumber" className="block text-sm font-medium mb-1">모터 번호 (1 이상의 정수)</Label>
                <Input 
                  id="motorNumber"
                  type="number" 
                  value={motorNumber} 
                  onChange={(e) => setMotorNumber(e.target.value)} 
                  placeholder="모터 번호 (예: 1)"
                  className="w-full"
                  disabled={availableSupplements.length === 0 || !selectedSupplement}
                  min="1"
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center bg-muted/30 rounded-b-xl p-4 space-y-2 sm:space-y-0">
          <Button 
            onClick={handleSaveMapping} 
            disabled={isLoading || (isEditing ? !editMotorNumber : !selectedSupplement || !motorNumber)}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> {isEditing ? '수정 저장' : '매핑 추가'}
          </Button>
          {isEditing && (
            <Button variant="outline" onClick={() => { setIsEditing(null); setEditMotorNumber(''); }} className="w-full sm:w-auto">취소</Button>
          )}
        </CardFooter>
      </Card>

      <Card className="shadow-lg rounded-xl">
        <CardHeader className="bg-muted/30 rounded-t-xl">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <CardTitle className="text-lg sm:text-xl">현재 디스펜서 매핑</CardTitle>
            <Button variant="outline" size="icon" onClick={fetchMappings} disabled={isLoading} title="새로고침">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>각 영양제가 할당된 모터 번호를 보여줍니다. 수정 또는 삭제할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading && Object.keys(mappings).length === 0 && <p className="text-center text-muted-foreground">로딩 중...</p>}
          {error && <p className="text-red-500 text-center">{error}</p>}
          {!isLoading && !error && Object.keys(mappings).length === 0 && (
            <p className="text-center text-muted-foreground">현재 설정된 매핑 정보가 없습니다. 위에서 새 매핑을 추가해주세요.</p>
          )}
          {Object.keys(mappings).length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>영양제 이름</TableHead>
                    <TableHead className="text-center">모터 번호</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(mappings)
                    .sort(([, motorA], [, motorB]) => motorA - motorB) // Sort by motor number
                    .map(([supplement, motor]) => (
                    <TableRow key={supplement}>
                      <TableCell className="font-medium">{supplement}</TableCell>
                      <TableCell className="text-center">{motor}</TableCell>
                      <TableCell className="text-right space-x-1 sm:space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(supplement, motor)} className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5">
                          <Edit3 className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> 수정
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteMapping(supplement)} className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5">
                          <Trash2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4" /> 삭제
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
