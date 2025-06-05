'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Added missing Label import
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Edit3, Trash2, RefreshCw } from 'lucide-react';

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

  const [availableSupplements, setAvailableSupplements] = useState<Supplement[]>([]);
  const [selectedSupplement, setSelectedSupplement] = useState<string>('');
  const [motorNumber, setMotorNumber] = useState<string>('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
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
      const response = await fetch('/api/supplements');
      if(!response.ok) {
        throw new Error('영양제 목록을 불러오는데 실패했습니다.');
      }
      const data: Supplement[] = await response.json();
      setAvailableSupplements(data);
    } catch (err:any) {
      console.error("Fetch supplements error:", err);
      toast({
        title: '오류',
        description: '사용 가능한 영양제 목록을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    }
  }, []);

  useEffect(() => {
    fetchMappings();
    fetchSupplements();
  }, [fetchMappings, fetchSupplements]);

  const supplementOptions = availableSupplements.map(s => ({
    value: s.name,
    label: s.name,
    disabled: mappings[s.name] !== undefined && s.name !== isEditing
  }));

  useEffect(() => {
    if (availableSupplements.length > 0 && !isEditing) {
      const firstUnmappedOption = supplementOptions.find(opt => !opt.disabled);
      if (firstUnmappedOption) {
        setSelectedSupplement(firstUnmappedOption.value);
      } else if (supplementOptions.length > 0) {
        // If all are mapped or no unmapped ones, select the first available (which might be disabled for selection)
        // Or, if the current selectedSupplement is valid, keep it.
        const currentSelectedIsValid = supplementOptions.some(opt => opt.value === selectedSupplement && !opt.disabled);
        if(!currentSelectedIsValid) {
            setSelectedSupplement(supplementOptions[0]?.value || ''); 
        }
      } else {
        setSelectedSupplement(''); 
      }
    }
     // If editing, selectedSupplement state is not changed here
  }, [availableSupplements, mappings, isEditing, supplementOptions, selectedSupplement]);


  const handleSaveMapping = async () => {
    if (isEditing) {
      if (!editMotorNumber || isNaN(parseInt(editMotorNumber)) || parseInt(editMotorNumber) < 0 ) {
        toast({ title: '오류', description: '유효한 모터 번호(0 이상의 정수)를 입력해주세요.', variant: 'destructive' });
        return;
      }
      const supplementKey = isEditing;
      const motorNum = parseInt(editMotorNumber);

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
    } else {
      if (!selectedSupplement || !motorNumber || isNaN(parseInt(motorNumber)) || parseInt(motorNumber) < 0) {
        toast({ title: '오류', description: '영양제를 선택하고 유효한 모터 번호(0 이상의 정수)를 입력해주세요.', variant: 'destructive' });
        return;
      }
      // Check if the selected supplement is already mapped (it should be disabled in dropdown, but double check)
      if (mappings[selectedSupplement] !== undefined) {
        toast({ title: '오류', description: `'${selectedSupplement}'은(는) 이미 매핑되어 있습니다. 기존 항목을 수정해주세요.`, variant: 'destructive' });
        return;
      }
      const motorNum = parseInt(motorNumber);
      const existingSupplementForMotor = Object.entries(mappings).find(([, motor]) => motor === motorNum);
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
        setMotorNumber('');
        // selectedSupplement state will be updated by the useEffect hook
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
      // selectedSupplement state will be updated by the useEffect hook if the deleted one was selected
    } catch (err: any) {
      console.error("Delete mapping error:", err);
      toast({ title: '오류', description: err.message || '매핑 삭제 중 오류 발생', variant: 'destructive' });
    }
  };

  const handleEditClick = (supplementName: string, currentMotorNumber: number) => {
    setIsEditing(supplementName);
    setEditMotorNumber(String(currentMotorNumber));
  };

  if (isLoading && Object.keys(mappings).length === 0 && availableSupplements.length === 0) return <div className="p-4 text-center">매핑 정보를 불러오는 중...</div>;

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6 shadow-lg rounded-xl">
        <CardHeader className="bg-muted/30 rounded-t-xl">
          <CardTitle className="text-lg sm:text-xl">
            {isEditing ? `'${isEditing}' 매핑 수정` : '새 영양제 매핑 추가'}
          </CardTitle>
          <CardDescription>
            {isEditing ? '모터 번호를 수정합니다. 다른 영양제에 이미 할당된 번호는 사용할 수 없습니다.' : '목록에서 영양제를 선택하고 사용하지 않는 모터 번호를 할당하세요.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {isEditing ? (
            <div>
              <Label htmlFor="editMotorNumber" className="block text-sm font-medium mb-1">모터 번호 (0 이상의 정수)</Label>
              <Input 
                id="editMotorNumber"
                type="number" 
                value={editMotorNumber} 
                onChange={(e) => setEditMotorNumber(e.target.value)} 
                placeholder="모터 번호 (예: 0)"
                className="w-full"
                min="0"
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
                  disabled={availableSupplements.length === 0 || supplementOptions.every(opt => opt.disabled)}
                >
                  {availableSupplements.length === 0 && <option value="">로딩 중...</option>}
                  {availableSupplements.length > 0 && supplementOptions.every(opt => opt.disabled) && 
                    (!selectedSupplement || supplementOptions.find(opt => opt.value === selectedSupplement)?.disabled) && 
                    <option value="">모든 영양제가 매핑됨</option>}
                  {supplementOptions.map(opt => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                      {opt.label} {opt.disabled ? '(이미 매핑됨)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="motorNumber" className="block text-sm font-medium mb-1">모터 번호 (0 이상의 정수)</Label>
                <Input 
                  id="motorNumber"
                  type="number" 
                  value={motorNumber} 
                  onChange={(e) => setMotorNumber(e.target.value)} 
                  placeholder="모터 번호 (예: 0)"
                  className="w-full"
                  disabled={availableSupplements.length === 0 || !selectedSupplement || supplementOptions.find(opt => opt.value === selectedSupplement)?.disabled }
                  min="0"
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center bg-muted/30 rounded-b-xl p-4 space-y-2 sm:space-y-0">
          <Button 
            onClick={handleSaveMapping} 
            disabled={isLoading || (isEditing ? !editMotorNumber : (!selectedSupplement || !motorNumber || supplementOptions.find(opt => opt.value === selectedSupplement)?.disabled))}
            className="w-full sm:w-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> {isEditing ? '수정 저장' : '매핑 추가'}
          </Button>
          {isEditing && (
            <Button variant="outline" onClick={() => { setIsEditing(null); setEditMotorNumber(''); setSelectedSupplement(supplementOptions.find(opt => !opt.disabled)?.value || ''); }} className="w-full sm:w-auto">취소</Button>
          )}
        </CardFooter>
      </Card>

      <Card className="shadow-lg rounded-xl">
        <CardHeader className="bg-muted/30 rounded-t-xl">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <CardTitle className="text-lg sm:text-xl">현재 디스펜서 매핑</CardTitle>
            <Button variant="outline" size="icon" onClick={() => { fetchMappings(); fetchSupplements();}} disabled={isLoading} title="새로고침">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>각 영양제가 할당된 모터 번호를 보여줍니다. 수정 또는 삭제할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading && Object.keys(mappings).length === 0 && availableSupplements.length === 0 && <p className="text-center text-muted-foreground">로딩 중...</p>}
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
                    .sort(([, motorA], [, motorB]) => motorA - motorB)
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
