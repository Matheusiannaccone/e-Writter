import { mockAuthAdapter } from "./adapters/mock/authAdapter.js";
import { supabaseAuthAdapter } from "./adapters/supabase/authAdapter.js";

import { mockProfileAdapter } from "./adapters/mock/profileAdapter.js";
//import { supabaseProfileAdapter } from "./adapters/supabase/profileAdapter.js";

export function getDataSource() {
  const hostname = window.location.hostname;

  const params = new URLSearchParams(window.location.search);
  const requestedDataSource = params.get("datasource");

  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1";

  if (isLocal && requestedDataSource !== "supabase") {
    return "mock";
  }

  return "supabase";
}

// Retorna o adapter de autenticação conforme a fonte de dados atual.
export function getAuthAdapter() {
  const dataSource = getDataSource();

  if (dataSource === "mock") {
    return mockAuthAdapter;
  }

  return supabaseAuthAdapter;
}

// Retorna o adapter de perfil conforme a fonte de dados atual.
export function getProfileAdapter() {
  const dataSource = getDataSource();

  if (dataSource === "mock") {
    return mockProfileAdapter;
  }

  return supabaseProfileAdapter;
}