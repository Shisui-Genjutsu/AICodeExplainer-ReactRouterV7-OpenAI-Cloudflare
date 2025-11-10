import { type RouteConfig, index, route } from "@react-router/dev/routes";

const routes: RouteConfig = [
    index("routes/home.tsx"),
    route("explain-code", "routes/explain-code.ts")
];

export default routes;
