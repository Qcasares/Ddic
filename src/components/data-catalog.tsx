import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataAssets, DataAsset } from '../hooks/use-data-assets';

export function DataCatalog() {
  const { dataAssets, isLoading } = useDataAssets();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = useMemo(() => {
    if (!Array.isArray(dataAssets)) {
      console.error('Invalid dataAssets format');
      return [];
    }

    return dataAssets.filter((asset: DataAsset) => {
      if (!asset?.name || typeof asset.name !== 'string') {
        console.warn('Invalid asset name:', asset);
        return false;
      }
      
      // Check if search term matches name, description or tags
      const searchLower = searchTerm.toLowerCase();
      return asset.name.toLowerCase().includes(searchLower) ||
             asset.description.toLowerCase().includes(searchLower) ||
             asset.tags.some(tag => tag.toLowerCase().includes(searchLower));
    });
  }, [dataAssets, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Catalog</CardTitle>
        <Input
          placeholder="Search data assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>{asset.name}</TableCell>
                  <TableCell>{asset.description}</TableCell>
                  <TableCell>{asset.tags.join(', ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
