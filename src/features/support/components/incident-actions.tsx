import { ConfirmAction } from '@/components/ui/confirm-action';
import { updateIncidentStatusAction } from '@/app/(admin)/suporte/actions';

export function IncidentActions({id,status}:{id:string;status:string}) {
  return <div className="mt-3 flex flex-wrap gap-2">
    {status==='OPEN'?<ConfirmAction triggerLabel="Iniciar" action={updateIncidentStatusAction.bind(null,id,'IN_PROGRESS')} impactMessage="Iniciar atendimento" requireReason confirmLabel="Iniciar"/>:null}
    {status==='IN_PROGRESS'?<ConfirmAction triggerLabel="Resolver" action={updateIncidentStatusAction.bind(null,id,'RESOLVED')} impactMessage="Registrar resolução" requireReason confirmLabel="Resolver"/>:null}
    {status==='IN_PROGRESS'?<ConfirmAction triggerLabel="Aguardar" action={updateIncidentStatusAction.bind(null,id,'WAITING')} impactMessage="Aguardar retorno" requireReason confirmLabel="Aguardar"/>:null}
    {status==='WAITING'||status==='RESOLVED'?<ConfirmAction triggerLabel="Retomar" action={updateIncidentStatusAction.bind(null,id,'IN_PROGRESS')} impactMessage="Retomar atendimento" requireReason confirmLabel="Retomar"/>:null}
    {status==='RESOLVED'?<ConfirmAction triggerLabel="Encerrar" action={updateIncidentStatusAction.bind(null,id,'CLOSED')} impactMessage="Encerrar incidente" requireReason confirmLabel="Encerrar"/>:null}
  </div>;
}
