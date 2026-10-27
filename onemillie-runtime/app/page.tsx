import Workshop from "./workshop";
import catalog from "../data/catalog.json";

export default function Home() {
  return <Workshop catalog={catalog} />;
}
