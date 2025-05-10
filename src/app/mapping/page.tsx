'''use client''';

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
        setSelectedSupplement(data[0].id); // Default to the first supplement
      }
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
    fetchSupplements(); // Fetch supplements for the add/edit form
  }, [fetchMappings, fetchSupplements]);

  // Handler to add or update a mapping
  const handleSaveMapping = async () => {
    if (isEditing) { // Update existing mapping
      if (!editMotorNumber || isNaN(parseInt(editMotorNumber))) {
        toast({ title: '오류', description: '유효한 모터 번호를 입력해주세요.', variant: 'destructive' });
        return;
      }
      const supplementKey = isEditing;
      const updatedMapping = { [supplementKey]: parseInt(editMotorNumber) };

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
      if (!selectedSupplement || !motorNumber || isNaN(parseInt(motorNumber))) {
        toast({ title: '오류', description: '영양제를 선택하고 유효한 모터 번호를 입력해주세요.', variant: 'destructive' });
        return;
      }
      if (mappings[selectedSupplement] !== undefined) {
        toast({ title: '오류', description: `'${selectedSupplement}'은(는) 이미 매핑되어 있습니다. 기존 항목을 수정해주세요.`, variant: 'destructive' });
        return;
      }
      const newMapping = { [selectedSupplement]: parseInt(motorNumber) };

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
        setSelectedSupplement(availableSupplements.length > 0 ? availableSupplements[0].id : '');
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

  if (isLoading && Object.keys(mappings).length === 0) return <div className="p-4">매핑 정보를 불러오는 중...</div>;
 // if (error) return <div className="p-4 text-red-500">오류: {error}</div>; // Error is handled by toast

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>새 영양제 매핑 추가 / 수정</CardTitle>
          <CardDescription>
            {isEditing 
              ? `'${isEditing}'의 모터 번호를 수정합니다.` 
              : '새로운 영양제를 선택하고 모터 번호를 할당하세요.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div>
              <label htmlFor="editMotorNumber" className="block text-sm font-medium text-gray-700 mb-1">모터 번호</label>
              <Input 
                id="editMotorNumber"
                type="number" 
                value={editMotorNumber} 
                onChange={(e) => setEditMotorNumber(e.target.value)} 
                placeholder="모터 번호 (예: 1)"
                className="w-full"
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="supplementSelect" className="block text-sm font-medium text-gray-700 mb-1">영양제 선택</label>
                <select 
                  id="supplementSelect"
                  value={selectedSupplement} 
                  onChange={(e) => setSelectedSupplement(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  disabled={availableSupplements.length === 0}
                >
                  {availableSupplements.length === 0 && <option value="">로딩 중...</option>}
                  {availableSupplements.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="motorNumber" className="block text-sm font-medium text-gray-700 mb-1">모터 번호</label>
                <Input 
                  id="motorNumber"
                  type="number" 
                  value={motorNumber} 
                  onChange={(e) => setMotorNumber(e.target.value)} 
                  placeholder="모터 번호 (예: 1)"
                  className="w-full"
                  disabled={availableSupplements.length === 0}
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button onClick={handleSaveMapping} disabled={isLoading || (isEditing ? !editMotorNumber : !selectedSupplement || !motorNumber)}>
            <PlusCircle className="mr-2 h-4 w-4" /> {isEditing ? '수정 저장' : '매핑 추가'}
          </Button>
          {isEditing && (
            <Button variant="outline" onClick={() => { setIsEditing(null); setEditMotorNumber(''); }}>취소</Button>
          )}
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>현재 디스펜서 매핑</CardTitle>
            <Button variant="outline" size="icon" onClick={fetchMappings} disabled={isLoading} title="새로고침">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>각 영양제가 할당된 모터 번호를 보여줍니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && Object.keys(mappings).length === 0 && <p>로딩 중...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!isLoading && !error && Object.keys(mappings).length === 0 && (
            <p>현재 설정된 매핑 정보가 없습니다. 위에서 새 매핑을 추가해주세요.</p>
          )}
          {Object.keys(mappings).length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>영양제 이름</TableHead>
                  <TableHead className="text-center">모터 번호</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(mappings).map(([supplement, motor]) => (
                  <TableRow key={supplement}>
                    <TableCell className="font-medium">{supplement}</TableCell>
                    <TableCell className="text-center">{motor}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(supplement, motor)}>
                        <Edit3 className="mr-1 h-4 w-4" /> 수정
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteMapping(supplement)}>
                        <Trash2 className="mr-1 h-4 w-4" /> 삭제
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
