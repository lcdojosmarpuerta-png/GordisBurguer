import React from 'react';
import { CocinaModule } from './components/CocinaModule';
import { GerenciaModule } from './components/GerenciaModule';
import { LoginModule } from './components/LoginModule';
import { MeseraModule } from './components/MeseraModule';
import { PublicMenuModule } from './components/PublicMenuModule';
import { ToastContainer } from './components/SharedUI';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';

function ModuleRouter() {
  const { activeModule } = useRestaurant();

  return (
    <>
      {activeModule === 'login' && <LoginModule />}
      {activeModule === 'gerencia' && <GerenciaModule />}
      {activeModule === 'mesera' && <MeseraModule />}
      {activeModule === 'cocina' && <CocinaModule />}
      {activeModule === 'menu_publico' && <PublicMenuModule />}
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <RestaurantProvider>
      <ModuleRouter />
    </RestaurantProvider>
  );
}
