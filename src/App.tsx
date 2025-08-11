import Dashboard from '@/components/dashboard';
import Settings from '@/components/settings';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function App() {
    return (
        <div className="p-8">
            <Tabs defaultValue="dashboard">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard">
                    <Dashboard />
                </TabsContent>

                <TabsContent value="settings">
                    <Settings />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default App;
