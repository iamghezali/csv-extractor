import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage'; // Adjust the path to your hook file
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PenLine, Trash2, PlusCircle } from 'lucide-react';

// Define the shape of a column object
interface Column {
    id: string;
    name: string;
    extractionRule: string;
}

const Settings = () => {
    // Replace useState and useEffect with the useLocalStorage hook
    const [columns, setColumns] = useLocalStorage<Column[]>('app-columns', []);

    // The rest of the state for managing the UI remains the same
    const [open, setOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentColumn, setCurrentColumn] = useState<Column | null>(null);

    // No changes are needed for the handler functions.
    // The `setColumns` function returned by your hook works just like the one from useState.

    const handleAdd = () => {
        setIsEditing(false);
        setCurrentColumn({ id: '', name: '', extractionRule: '' });
        setOpen(true);
    };

    const handleEdit = (column: Column) => {
        setIsEditing(true);
        setCurrentColumn(column);
        setOpen(true);
    };

    const handleDelete = (id: string) => {
        setColumns(columns.filter((column) => column.id !== id));
    };

    const handleSave = () => {
        if (currentColumn) {
            if (isEditing) {
                setColumns(
                    columns.map((column) =>
                        column.id === currentColumn.id ? currentColumn : column,
                    ),
                );
            } else {
                setColumns([
                    ...columns,
                    { ...currentColumn, id: Date.now().toString() },
                ]);
            }
        }
        setOpen(false);
    };

    return (
        <div>
            <div className="mt-4 mb-6 flex items-end justify-between">
                <div>
                    <h2 className="text-lg font-bold">Manage Columns</h2>
                    <p className="text-neutral-500">
                        Add, Edit or delete Columns. Your changes are saved
                        automatically.
                    </p>
                </div>

                <div className="flex space-x-2">
                    <Button onClick={handleAdd}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Column
                    </Button>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableCaption>
                        A list of your configured columns.
                    </TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Extraction Rule</TableHead>
                            <TableHead className="w-28 text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {columns.length > 0 ? (
                            columns.map((column) => (
                                <TableRow key={column.id}>
                                    <TableCell className="font-mono text-xs">
                                        {column.id}
                                    </TableCell>
                                    <TableCell>{column.name}</TableCell>
                                    <TableCell>
                                        {column.extractionRule}
                                    </TableCell>
                                    <TableCell className="flex justify-end space-x-2">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => handleEdit(column)}
                                        >
                                            <PenLine className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>
                                                        Are you sure?
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be
                                                        undone. This will
                                                        permanently delete the
                                                        column.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>
                                                        Cancel
                                                    </AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() =>
                                                            handleDelete(
                                                                column.id,
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={4}
                                    className="h-24 text-center"
                                >
                                    No columns configured. Click "Add New
                                    Column" to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {isEditing ? 'Edit Column' : 'Add New Column'}
                            </DialogTitle>
                            <DialogDescription>
                                {isEditing
                                    ? 'Make changes to your column here.'
                                    : 'Add a new column to your table.'}{' '}
                                Click save when you're done.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Product Name"
                                    value={currentColumn?.name || ''}
                                    onChange={(e) =>
                                        setCurrentColumn({
                                            ...currentColumn!,
                                            name: e.target.value,
                                        })
                                    }
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label
                                    htmlFor="extractionRule"
                                    className="text-right"
                                >
                                    Extraction Rule
                                </Label>
                                <Input
                                    id="extractionRule"
                                    placeholder="e.g., Extract the name of the product"
                                    value={currentColumn?.extractionRule || ''}
                                    onChange={(e) =>
                                        setCurrentColumn({
                                            ...currentColumn!,
                                            extractionRule: e.target.value,
                                        })
                                    }
                                    className="col-span-3"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};
export default Settings;
