import {afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import App,{TelemetryChart} from './App';
const evidence=['temperature','vibration','pressure'].map(channel=>({channel,unit:'unit',mean:65,median:65,std:1,observed_count:120,missing_count:0,baseline_median:65,baseline_scale:1,anomaly_minutes:channel==='temperature'?[80]:[],scores:[]}));
const data={id:'sim',simulated:true,scenario:'cooling_loss',equipment:'P-104',measurements:Array.from({length:120},(_,minute)=>({minute,state:'running',temperature:minute<80?65:79,vibration:2,pressure:6})),evidence,model:{provider:'mock',model_id:'mock-forge-v1',simulated:true,limitations:'Mock suggestions only.',hypotheses:[{title:'Process condition changed',rationale:'Unverified',next_test:'Compare baseline'}]},timeline:[{minute:0,event:'Synthetic acquisition started'}]};
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('dashboard',()=>{
 it('loads backend evidence and labels simulation and mock inference',async()=>{
 const fetchMock=vi.fn().mockImplementation((url:string)=>Promise.resolve({ok:true,json:()=>Promise.resolve(url.includes('model-status')?{provider:'mock',status:'mock_ready'}:data)}));vi.stubGlobal('fetch',fetchMock);
 render(<App/>);expect(screen.getByRole('status')).toBeInTheDocument();
 expect(await screen.findByText('Process condition changed')).toBeInTheDocument();
 expect(screen.getByText('SIMULATED DATA')).toBeInTheDocument();expect(screen.getByText('MOCK · UNVERIFIED')).toBeInTheDocument();
 expect(screen.getAllByRole('img')).toHaveLength(3);expect(screen.getByText('79.00')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Scenario'),{target:{value:'normal'}});
 await waitFor(()=>expect(fetchMock).toHaveBeenCalledWith('/api/v1/investigations/demo?scenario=normal',expect.anything()));
 });
 it('shows an actionable error and retries',async()=>{
 const f=vi.fn().mockResolvedValue({ok:false,status:503});vi.stubGlobal('fetch',f);render(<App/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('503');fireEvent.click(screen.getByText('Retry'));
 await waitFor(()=>expect(f.mock.calls.length).toBeGreaterThan(2));
 });
 it('does not connect chart lines across missing values',()=>{
 const e={...evidence[0],channel:'temperature' as const};const rows=data.measurements.map((r,i)=>({...r,temperature:i===60?null:r.temperature}));
 const {container}=render(<TelemetryChart rows={rows} evidence={e}/>);expect(container.querySelectorAll('polyline')).toHaveLength(2);
 });
});
