import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDataAssets, DataAsset } from '../hooks/use-data-assets';

export function DataCatalog() {
  const { dataAssets, isLoading } = useDataAssets();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = useMemo(() => {
    return dataAssets.filter((asset: DataAsset) =>
      asset.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
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
