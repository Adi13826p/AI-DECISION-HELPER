import { Switch, Route, Router as WouterRouter } from "wouter";
import Popup from "@/pages/Popup";
import TruthLayer from "@/pages/TruthLayer";
import MasterScan from "@/pages/MasterScan";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Popup} />
      <Route path="/truth-layer" component={TruthLayer} />
      <Route path="/masterscan" component={MasterScan} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default App;
