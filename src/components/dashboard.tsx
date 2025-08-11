import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
    Download,
    RefreshCcw,
    Loader2,
    Sparkles,
    Terminal,
} from 'lucide-react';
import { extractData } from '@/services/geminiService';
import { PROMPT_EXTRACT_CONTENT, PROMPT_EXTRACT_DATA } from '@/contants';
import { ScrollArea } from '@/components/ui/scroll-area';

// --- Type Definitions ---
interface Column {
    id: string;
    name: string;
    extractionRule: string;
}

// 1. UPDATE DATA STRUCTURE: Now includes id and the original text
interface TableRowData extends Record<string, string> {
    id: string;
    originalText: string;
}

interface ContentItem {
    titre: string;
    contenu: string;
}

// --- Prompt Generation Functions ---
const extractDataPrompt = (text: string, columns: Column[]): string => {
    const columnDetails = columns
        .map(
            (col) =>
                `- Column "${col.name}": Should contain "${col.extractionRule}".`,
        )
        .join('\n');
    const columnNames = columns.map((col) => col.name).join(';');
    return `${PROMPT_EXTRACT_DATA} Column Rules: ${columnDetails}. User's Text: --- ${text} --- CSV Output (headers: ${columnNames}):`;
};

// 2. NEW PROMPT: A separate prompt for generating content from a row's text
const extractContentPrompt = (text: string): string => {
    return `${PROMPT_EXTRACT_CONTENT} --- Text to analyse: --- ${text} --- CSV Output:`;
};

const Dashboard = () => {
    const [columns] = useLocalStorage<Column[]>('app-columns', []);
    const [inputText, setInputText] = useState('');

    // Use the updated TableRowData type
    const [extractedData, setExtractedData] = useState<TableRowData[]>([]);

    const [error, setError] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false); // For the main textarea

    // --- State for the "Extract Content" feature ---
    const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
    const [rawExtractedContent, setRawExtractedContent] = useState('');
    const [parsedContent, setParsedContent] = useState<ContentItem[]>([]);
    const [loadingRowId, setLoadingRowId] = useState<string | null>(null); // To show spinner on the correct row

    const tableHeaders = columns.map((column) => column.name);

    // --- Logic for Extracting and Adding a Row ---
    const handleExtractAndAddRow = async () => {
        setIsExtracting(true);
        setError(null);

        try {
            const prompt = extractDataPrompt(inputText, columns);
            const csvLine = await extractData(prompt);
            const values = csvLine?.split(';');

            if (values?.length !== columns.length) {
                throw new Error(
                    `Data validation failed. The AI returned ${values?.length} values, but ${columns.length} were expected.`,
                );
            }

            const newRowData: Record<string, string> = {};
            columns.forEach((col, index) => {
                newRowData[col.name] = values[index].trim();
            });

            // Create the new row with the original text and a unique ID
            const newRow: TableRowData = {
                id: Date.now().toString(),
                originalText: inputText,
                ...newRowData,
            };

            setExtractedData((prevData) => [...prevData, newRow]);
            setInputText(''); // Clear input on success
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsExtracting(false);
        }
    };

    // --- Logic for the "Extract Content" Button in each row ---
    const handleExtractContent = async (row: TableRowData) => {
        setLoadingRowId(row.id);
        setError(null);
        setRawExtractedContent('');
        setParsedContent([]); // Reset parsed content

        try {
            const prompt = extractContentPrompt(row.originalText);
            const resultCsv = await extractData(prompt);

            // Store the raw string for the download button
            setRawExtractedContent(resultCsv);

            // Parse the CSV result for previewing in the dialog

            function parseCsvToArray(
                csv: string,
            ): { titre: string; contenu: string }[] {
                const lines = csv.split(/\r?\n/);
                const result: { titre: string; contenu: string }[] = [];

                let currentTitle = '';
                let currentContent = '';
                let insideQuoted = false;

                for (let i = 1; i < lines.length; i++) {
                    // skip header
                    let line = lines[i];

                    if (!insideQuoted) {
                        // Split only on the first ';'
                        const sepIndex = line.indexOf(';');
                        if (sepIndex === -1) continue; // skip malformed lines

                        currentTitle = line.slice(0, sepIndex).trim();
                        currentContent = line.slice(sepIndex + 1).trim();

                        // Check if content starts with a quote but doesn’t end with it → multiline
                        if (
                            currentContent.startsWith('"') &&
                            !currentContent.endsWith('"')
                        ) {
                            insideQuoted = true;
                            currentContent = currentContent.slice(1); // remove starting quote
                            continue;
                        }

                        // Single-line quoted content
                        if (
                            currentContent.startsWith('"') &&
                            currentContent.endsWith('"')
                        ) {
                            currentContent = currentContent.slice(1, -1);
                        }

                        result.push({
                            titre: currentTitle,
                            contenu: currentContent,
                        });
                    } else {
                        // Append next line to current content
                        currentContent += '\n' + line;

                        // If we reach a closing quote, finish the row
                        if (line.endsWith('"')) {
                            insideQuoted = false;
                            currentContent = currentContent.slice(0, -1); // remove last quote
                            result.push({
                                titre: currentTitle,
                                contenu: currentContent,
                            });
                        }
                    }
                }

                return result;
            }

            const parsed = parseCsvToArray(resultCsv);

            setParsedContent(parsed);
            setIsContentDialogOpen(true);
        } catch (err: any) {
            setError(
                `Failed to generate content for row ${row.id}. Error: ${err.message}`,
            );
        } finally {
            setLoadingRowId(null);
        }
    };

    const handleReset = () => {
        setInputText('');
        setExtractedData([]);
        setError(null);
        setIsExtracting(false);
    };

    const handleExport = () => {
        const csvHeader = tableHeaders.join(';') + '\n';
        const csvBody = extractedData
            .map((row) =>
                tableHeaders.map((header) => `"${row[header]}"`).join(';'),
            )
            .join('\n');

        const csvContent = csvHeader + csvBody;
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'extracted_data.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadContent = () => {
        if (!rawExtractedContent) return;

        // Add the header back for the downloaded file
        const blob = new Blob([rawExtractedContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'extracted_content.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            {/* Header and Controls */}
            <div className="mt-4 mb-6 flex items-end justify-between">
                <div>
                    <h2 className="text-lg font-bold">Extract Data</h2>
                    <p className="text-neutral-500">
                        Paste text below to add a structured row to the table.
                    </p>
                </div>
                <div className="flex space-x-2">
                    <Button variant="outline" size="icon" onClick={handleReset}>
                        <RefreshCcw className="h-5 w-5" />
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={extractedData.length === 0 || isExtracting}
                    >
                        <Download className="mr-2 h-5 w-5" /> Export CSV
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-7 grid-rows-1 gap-6">
                {/* Left Panel for Input */}
                <div className="col-span-2">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Textarea
                                placeholder="Example: The 'Advanced React' course is taught by Jane Doe and has a duration of 12 hours."
                                className="max-h-40 min-h-40"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                disabled={isExtracting}
                            />
                            <Button
                                onClick={handleExtractAndAddRow}
                                disabled={
                                    isExtracting ||
                                    columns.length === 0 ||
                                    !inputText
                                }
                                className="w-full"
                            >
                                {isExtracting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                                        Extracting...
                                    </>
                                ) : (
                                    'Extract and Add Row'
                                )}
                            </Button>
                        </div>

                        {columns.length === 0 && !isExtracting && (
                            <Alert>
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>No Columns Configured</AlertTitle>
                                <AlertDescription>
                                    Please go to the Settings page to add
                                    columns for data extraction.
                                </AlertDescription>
                            </Alert>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Extraction Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>

                <div className="col-span-5 col-start-3">
                    <div className="rounded-md border">
                        <Table>
                            <TableCaption>
                                A list of your extracted content.
                            </TableCaption>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    {tableHeaders.map((header) => (
                                        <TableHead key={header}>
                                            {header}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {extractedData.length > 0 ? (
                                    extractedData.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleExtractContent(
                                                            row,
                                                        )
                                                    }
                                                    disabled={
                                                        loadingRowId === row.id
                                                    }
                                                >
                                                    {loadingRowId === row.id ? (
                                                        <Loader2 className="animate-spin" />
                                                    ) : (
                                                        <Sparkles />
                                                    )}
                                                </Button>
                                            </TableCell>

                                            {tableHeaders.map((header) => (
                                                <TableCell key={header}>
                                                    {row[header]}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={tableHeaders.length + 1}
                                            className="h-24 text-center"
                                        >
                                            Your extracted data will appear
                                            here.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            {/* Dialog to display the generated content */}
            <Dialog
                open={isContentDialogOpen}
                onOpenChange={setIsContentDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Extracted Content</DialogTitle>
                        <DialogDescription>
                            Here is the extracted Content preview
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="h-72 w-full rounded-md border p-4">
                        <div className="space-y-6">
                            {parsedContent.length > 0 ? (
                                parsedContent.map((item, index) => (
                                    <div key={index}>
                                        <h3 className="mb-1 text-lg font-semibold">
                                            {item.titre}
                                        </h3>
                                        <pre className="text-muted-foreground text-sm text-wrap">
                                            {item.contenu}
                                        </pre>
                                    </div>
                                ))
                            ) : (
                                <p>
                                    No content was extracted or the format was
                                    invalid.
                                </p>
                            )}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="sm:justify-end">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsContentDialogOpen(false)}
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDownloadContent}
                            disabled={!rawExtractedContent}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download CSV
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Dashboard;
