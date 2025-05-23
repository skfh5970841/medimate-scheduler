'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

interface Supplement {
  id: string;
  name: string;
  quantity?: number; // quantity 필드 추가 (옵셔널)
}

export default function SupplementsAdminPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [newSupplementId, setNewSupplementId] = useState<string>('');
  const [newSupplementName, setNewSupplementName] = useState<string>('');
  // newSupplementQuantity 상태는 추가 시점에 사용하지 않으므로 제거, 필요시 다시 추가 가능
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSupplements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/supplements');
      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        throw new Error(errorResult.message || `영양제 목록을 불러오는데 실패했습니다: ${response.status}`);
      }
      const data: Supplement[] = await response.json();
      setSupplements(data);
    } catch (err: any) {
      console.error("Fetch supplements error:", err);
      setError(err.message || '영양제 목록을 불러오는 중 오류가 발생했습니다.');
      toast({ title: '오류', description: err.message, variant: 'destructive' });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSupplements();
  }, [fetchSupplements]);

  const handleAddSupplement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplementId.trim() || !newSupplementName.trim()) {
      toast({ title: '입력 오류', description: '영양제 ID와 이름을 모두 입력해주세요.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      // 추가 시에는 quantity를 보내지 않음. 서버에서 supplements.json 생성 시 quantity 필드를 초기화하거나
      // ESP32가 업데이트 하도록 함. 또는 필요에 따라 초기 quantity 입력 필드 추가 가능.
      const response = await fetch('/api/supplements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newSupplementId.trim(), name: newSupplementName.trim() }),
      });
      const result = await response.json(); // 여기서 반환되는 객체에는 quantity가 없을 수 있음
      if (!response.ok) {
        throw new Error(result.message || '영양제 추가 실패');
      }
      toast({ title: '성공', description: `'${result.name}' 영양제가 추가되었습니다.` });
      // 서버에서 반환된 객체로 상태 업데이트 (quantity가 없다면 undefined가 됨)
      setSupplements(prev => [...prev, result as Supplement]);
      setNewSupplementId('');
      setNewSupplementName('');
    } catch (err: any) {
      console.error("Add supplement error:", err);
      toast({ title: '오류', description: err.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleDeleteSupplement = async (id: string, name: string) => {
    if (!confirm(`'${name}' (ID: ${id}) 영양제를 삭제하시겠습니까?
주의: 이 영양제를 사용하는 스케줄이나 매핑이 있다면 삭제되지 않습니다.`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/supplements?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || '영양제 삭제 실패');
      }
      toast({ title: '성공', description: result.message });
      setSupplements(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      console.error("Delete supplement error:", err);
      toast({ title: '오류', description: err.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>새 영양제 추가</CardTitle>
          <CardDescription>시스템에서 사용할 수 있는 새로운 영양제를 등록합니다. 초기 수량은 ESP32에 의해 업데이트됩니다.</CardDescription>
        </CardHeader>
        <form onSubmit={handleAddSupplement}>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="newSupplementId">영양제 ID</Label>
                    <Input 
                        id="newSupplementId" 
                        value={newSupplementId} 
                        onChange={(e) => setNewSupplementId(e.target.value)} 
                        placeholder="예: vitamin-c (영어, 숫자, 하이픈만)"
                        disabled={isSubmitting}
                        pattern="^[a-zA-Z0-9-]+$"
                        title="ID는 영어, 숫자, 하이픈만 사용할 수 있습니다."
                    />
                </div>
                <div>
                    <Label htmlFor="newSupplementName">영양제 이름</Label>
                    <Input 
                        id="newSupplementName" 
                        value={newSupplementName} 
                        onChange={(e) => setNewSupplementName(e.target.value)} 
                        placeholder="예: 비타민 C"
                        disabled={isSubmitting}
                    />
                </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || !newSupplementId || !newSupplementName}>
              <PlusCircle className="mr-2 h-4 w-4" /> {isSubmitting ? '추가 중...' : '영양제 추가'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>등록된 영양제 목록</CardTitle>
            <Button variant="outline" size="icon" onClick={fetchSupplements} disabled={isLoading || isSubmitting} title="목록 새로고침">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>현재 시스템에 등록되어 스케줄 및 매핑에 사용할 수 있는 영양제들입니다. 잔량은 ESP32에서 업데이트됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-center py-4">영양제 목록을 불러오는 중...</p>}
          {error && !isLoading && 
            <div className="text-red-600 bg-red-100 p-3 rounded-md flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" /> {error}
            </div>}
          {!isLoading && !error && supplements.length === 0 && (
            <p className="text-center text-muted-foreground py-4">등록된 영양제가 없습니다. 위에서 새 영양제를 추가해주세요.</p>
          )}
          {!isLoading && !error && supplements.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>잔량</TableHead> {/* 잔량 헤더 추가 */}
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplements.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono">{s.id}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.quantity !== undefined ? s.quantity : 'N/A'}</TableCell> {/* 잔량 표시 */}
                    <TableCell className="text-right">
                      <Button 
                        variant="destructive"
                        size="sm" 
                        onClick={() => handleDeleteSupplement(s.id, s.name)}
                        disabled={isSubmitting}
                        title={`'${s.name}' 삭제`}
                      >
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
