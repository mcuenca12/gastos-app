"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserRound, Lock, Link2, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { setAdminToken, setStoredMemberId } from "@/lib/storage";
import { CreateGroupResult } from "@/lib/types";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function HomePage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [yourName, setYourName] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinId, setJoinId] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!groupName.trim() || !yourName.trim()) {
      setError("Ponle un nombre al grupo y escribe tu nombre.");
      return;
    }

    setLoading(true);
    const { data, error: createErr } = await supabase.rpc(
      "create_group_with_members",
      {
        p_name: groupName.trim(),
        p_pin: pin.trim() || null,
        p_member_name: yourName.trim(),
      }
    );

    const result = data as CreateGroupResult | null;
    if (createErr || !result) {
      setError("No se pudo crear el grupo. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    setAdminToken(result.group_id, result.admin_token);
    setStoredMemberId(result.group_id, result.member_id);
    router.push(`/grupo/${result.group_id}`);
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const id = joinId.trim().split("/").pop();
    if (id) router.push(`/grupo/${id}`);
  }

  return (
    <main className="space-y-8">
      <header className="animate-fade-in">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          <Sparkles className="h-3.5 w-3.5" />
          Sin registro, sin apps que instalar
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-sand-900 sm:text-3xl">
          Divide gastos con tu grupo
        </h1>
        <p className="mt-2 max-w-md text-sm text-sand-600">
          Crea un grupo, comparte el link con tu gente y registren los gastos a
          medida que pasan. La app calcula quién le debe a quién.
        </p>
      </header>

      <Card title="Crear un grupo nuevo" icon={Users} className="animate-fade-in">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="groupName"
            label="Nombre del grupo"
            placeholder="Ej. Viaje a Salento"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <Input
            id="yourName"
            label="Tu nombre"
            icon={<UserRound className="h-4 w-4" />}
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            hint="Los demás integrantes entran compartiendo el link del grupo."
          />
          <Input
            id="pin"
            label="PIN opcional"
            icon={<Lock className="h-4 w-4" />}
            placeholder="4 dígitos, para no compartir el link a lo loco"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={6}
          />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" loading={loading} className="w-full">
            {!loading && <ArrowRight className="h-4 w-4" />}
            {loading ? "Creando..." : "Crear grupo"}
          </Button>
        </form>
      </Card>

      <Card title="¿Ya tienes un grupo?" icon={Link2}>
        <form onSubmit={handleJoin} className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Pega el link o el ID del grupo"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline">
            Entrar
          </Button>
        </form>
      </Card>
    </main>
  );
}
