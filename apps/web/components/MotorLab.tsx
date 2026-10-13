"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { interpretLocalCommand } from "@motormind/ai-tools";
import { inlineFourDohcTurboFixture } from "@motormind/engine-schema/fixture";
import type { PartId } from "@motormind/engine-schema";
import { EngineCanvas, type Telemetry } from "./EngineCanvas";
import {
  ChevronIcon,
  ExplodeIcon,
  FocusIcon,
  GaugeIcon,
  MicIcon,
  PowerIcon,
  ResetIcon,
  SendIcon,
  UndoIcon,
  VrIcon,
  XrayIcon,
} from "./icons";
import { useEngineStore } from "../lib/store";

const phaseLabels: Record<string, string> = {
  intake: "ADMISIÓN",
  compression: "COMPRESIÓN",
  power: "EXPANSIÓN",
  exhaust: "ESCAPE",
};
const initialTelemetry: Telemetry = {
  torque: {
    indicatedNm: 0,
    resistingNm: 7,
    netNm: -7,
    smoothness: 1,
    perCylinderNm: [0, 0, 0, 0],
    fidelity: "first-order",
  },
  phase: "power",
  cycleDeg: 0,
};

export function MotorLab() {
  const running = useEngineStore((s) => s.running);
  const rpm = useEngineStore((s) => s.rpm);
  const selectedPartId = useEngineStore((s) => s.selectedPartId);
  const xray = useEngineStore((s) => s.xray);
  const exploded = useEngineStore((s) => s.exploded);
  const isolated = useEngineStore((s) => s.isolatedPartId);
  const activeFaultIds = useEngineStore((s) => s.activeFaultIds);
  const removedPartIds = useEngineStore((s) => s.removedPartIds);
  const notice = useEngineStore((s) => s.notice);
  const dispatch = useEngineStore((s) => s.dispatch);
  const [telemetry, setTelemetry] = useState(initialTelemetry);
  const onTelemetry = useCallback((value: Telemetry) => setTelemetry(value), []);
  const [chat, setChat] = useState([
    {
      role: "assistant",
      text: "Banco conectado. Probá “Mostrame el cigüeñal” o “Encendé el motor a 1500 RPM”.",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [listening, setListening] = useState(false);
  const [xrStatus, setXrStatus] = useState("");
  const selectedPart = inlineFourDohcTurboFixture.parts.find((part) => part.id === selectedPartId);
  const plan = useEngineStore((s) => s.planPistonTwo)();

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    const interpretation = interpretLocalCommand(clean, useEngineStore.getState());
    interpretation.commands.forEach((command) => dispatch(command, "copilot"));
    setChat((items) => [
      ...items.slice(-6),
      { role: "user", text: clean },
      { role: "assistant", text: interpretation.reply },
    ]);
    setPrompt("");
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send(prompt);
  };
  const startVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setChat((items) => [
        ...items,
        {
          role: "assistant",
          text: "El reconocimiento de voz del navegador no está disponible. Usá la entrada de texto.",
        },
      ]);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event: any) => send(event.results[0][0].transcript);
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };
  const checkXR = async () => {
    const xr = (navigator as any).xr;
    if (!xr) {
      setXrStatus("WebXR no está disponible en este navegador.");
      return;
    }
    const supported = await xr.isSessionSupported("immersive-vr");
    setXrStatus(
      supported
        ? "WebXR disponible · abrí la experiencia IWSDK en el puerto dedicado."
        : "El runtime no ofrece immersive-vr. Usá el emulador IWSDK o un dispositivo compatible.",
    );
  };
  const torqueTone = telemetry.torque.netNm >= 0 ? "positive" : "negative";
  const activeFaults = inlineFourDohcTurboFixture.faults.filter((fault) =>
    activeFaultIds.includes(fault.id),
  );
  const systems = useMemo(
    () => [
      { name: "Tren inferior", count: 9, system: "bottom-end" },
      { name: "Distribución DOHC", count: 10, system: "valvetrain" },
      { name: "Admisión turbo", count: 1, system: "induction" },
      { name: "Encendido", count: 4, system: "ignition" },
    ],
    [],
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <span />
          </div>
          <div>
            <b>MOTORMIND</b>
            <small>XR · MECHANICAL INTELLIGENCE</small>
          </div>
        </div>
        <div className="engine-id">
          <span className="status-dot" /> SIMULACIÓN LOCAL <b>I4 · DOHC · TURBO</b>
        </div>
        <button className="button button-ghost xr-button" onClick={checkXR}>
          <VrIcon /> ENTRAR EN XR
        </button>
      </header>

      <section className="workspace">
        <aside className="left-panel panel" aria-label="Explorador de componentes">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">BANCO 01</span>
              <h1>Motor genérico I4</h1>
            </div>
            <span className="schema-badge">SCHEMA v1</span>
          </div>
          <p className="panel-copy">
            Mecanismo paramétrico educativo. Valores no atribuidos a un motor comercial.
          </p>
          <div className="section-label">SISTEMAS</div>
          <nav className="system-list">
            {systems.map((item) => (
              <button
                key={item.system}
                onClick={() => {
                  const first = inlineFourDohcTurboFixture.parts.find(
                    (part) => part.system === item.system,
                  );
                  if (first) dispatch({ type: "select_part", partId: first.id });
                }}
              >
                <span>{item.name}</span>
                <small>{item.count}</small>
                <ChevronIcon />
              </button>
            ))}
          </nav>
          <div className="section-label row-label">
            <span>COMPONENTES</span>
            <small>{inlineFourDohcTurboFixture.parts.length}</small>
          </div>
          <div className="parts-list">
            {inlineFourDohcTurboFixture.parts.map((part) => (
              <button
                key={part.id}
                className={selectedPartId === part.id ? "selected" : ""}
                onClick={() => dispatch({ type: "select_part", partId: part.id })}
              >
                <span className={`part-swatch ${part.system}`} />
                <span>
                  <b>{part.name}</b>
                  <small>{part.system}</small>
                </span>
                {removedPartIds.includes(part.id) && <em>FUERA</em>}
              </button>
            ))}
          </div>
        </aside>

        <section className="stage" aria-label="Laboratorio tridimensional">
          <EngineCanvas onTelemetry={onTelemetry} />
          <div className="stage-top">
            <div className="live-chip">
              <span /> {running ? "MOTOR EN MARCHA" : "MOTOR DETENIDO"}
            </div>
            <div className="tool-cluster">
              <button
                aria-pressed={xray}
                className={xray ? "active" : ""}
                onClick={() => dispatch({ type: "set_xray_mode", enabled: !xray })}
                title="Rayos X"
              >
                <XrayIcon />
                <span>RAYOS X</span>
              </button>
              <button
                aria-pressed={exploded}
                className={exploded ? "active" : ""}
                onClick={() => dispatch({ type: "explode_engine", enabled: !exploded })}
                title="Vista explotada"
              >
                <ExplodeIcon />
                <span>EXPLOTAR</span>
              </button>
              <button
                aria-pressed={Boolean(isolated)}
                className={isolated ? "active" : ""}
                disabled={!selectedPartId}
                onClick={() =>
                  useEngineStore
                    .getState()
                    .setIsolated(isolated ? null : (selectedPartId as PartId))
                }
                title="Aislar pieza"
              >
                <FocusIcon />
                <span>AISLAR</span>
              </button>
              <button onClick={() => dispatch({ type: "reset_engine" })} title="Restablecer">
                <ResetIcon />
                <span>RESET</span>
              </button>
            </div>
          </div>
          {selectedPart && (
            <div className="selection-card">
              <span className="eyebrow">SELECCIÓN</span>
              <b>{selectedPart.name}</b>
              <small>{selectedPart.id}</small>
            </div>
          )}
          <div className="stage-bottom">
            <div className="cycle-card">
              <div className="cycle-title">
                <span>CILINDRO 1 · CICLO 4T</span>
                <b>{Math.round(telemetry.cycleDeg)}° / 720°</b>
              </div>
              <div className="cycle-track">
                {["power", "exhaust", "intake", "compression"].map((phase) => (
                  <div key={phase} className={telemetry.phase === phase ? "active" : ""}>
                    <span>{phaseLabels[phase]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rpm-control">
              <button
                className={`power-button ${running ? "on" : ""}`}
                aria-label={running ? "Detener motor" : "Encender motor"}
                onClick={() => dispatch({ type: running ? "stop_engine" : "start_engine" })}
              >
                <PowerIcon />
              </button>
              <div className="rpm-readout">
                <span>RÉGIMEN</span>
                <b>{running ? rpm.toLocaleString("es-AR") : "0"}</b>
                <small>RPM</small>
              </div>
              <label>
                <span className="sr-only">RPM objetivo</span>
                <input
                  type="range"
                  min="600"
                  max="6500"
                  step="50"
                  value={rpm}
                  onChange={(e) =>
                    dispatch({ type: "set_engine_rpm", rpm: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          </div>
        </section>

        <aside className="right-panel panel">
          <section className="telemetry-section">
            <div className="section-label">TELEMETRÍA · MODELO 1er ORDEN</div>
            <div className="metric-grid">
              <article>
                <GaugeIcon />
                <span>PAR NETO</span>
                <b className={torqueTone}>{telemetry.torque.netNm.toFixed(1)}</b>
                <small>N·m</small>
              </article>
              <article>
                <span>SUAVIDAD</span>
                <b>{Math.round(telemetry.torque.smoothness * 100)}</b>
                <small>%</small>
              </article>
            </div>
            <div className="cylinder-bars">
              {telemetry.torque.perCylinderNm.map((value, index) => (
                <div key={index}>
                  <span>C{index + 1}</span>
                  <i>
                    <em style={{ height: `${Math.max(5, Math.min(100, value))}%` }} />
                  </i>
                </div>
              ))}
            </div>
          </section>

          <section className="fault-section">
            <div className="section-title">
              <div>
                <span className="section-label">SIMULADOR DE FALLAS</span>
                <h2>Inyectar condición</h2>
              </div>
              {activeFaults.length > 0 && (
                <button className="text-button" onClick={() => dispatch({ type: "clear_faults" })}>
                  LIMPIAR
                </button>
              )}
            </div>
            <div className="fault-list">
              {inlineFourDohcTurboFixture.faults.map((fault) => (
                <button
                  key={fault.id}
                  className={activeFaultIds.includes(fault.id) ? "active" : ""}
                  onClick={() => dispatch({ type: "simulate_fault", faultId: fault.id })}
                >
                  <span className="fault-indicator" />
                  <span>
                    <b>{fault.name}</b>
                    <small>
                      {fault.fidelity} · factor {fault.torqueFactor}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            {activeFaults[0] && <p className="fault-note">{activeFaults[0].explanation}</p>}
          </section>

          <section className="procedure-section">
            <div className="section-title">
              <div>
                <span className="section-label">DESMONTAJE GUIADO</span>
                <h2>Acceder al pistón 2</h2>
              </div>
              <div className="mini-actions">
                <button
                  aria-label="Deshacer desmontaje"
                  onClick={() => useEngineStore.getState().undo()}
                >
                  <UndoIcon />
                </button>
                <button
                  aria-label="Rehacer desmontaje"
                  onClick={() => useEngineStore.getState().redo()}
                >
                  <UndoIcon className="redo" />
                </button>
              </div>
            </div>
            <ol>
              {["intake-camshaft", "exhaust-camshaft", "spark-plug-2", "piston-2"].map(
                (id, index) => (
                  <li
                    key={id}
                    className={removedPartIds.includes(id) ? "done" : plan[0] === id ? "next" : ""}
                  >
                    <span>{removedPartIds.includes(id) ? "✓" : index + 1}</span>
                    {inlineFourDohcTurboFixture.parts.find((part) => part.id === id)?.name}
                  </li>
                ),
              )}
            </ol>
            <button
              className="button button-primary full"
              onClick={() => useEngineStore.getState().executeNextRemoval()}
              disabled={plan.length === 0}
            >
              {plan.length
                ? `EJECUTAR · ${inlineFourDohcTurboFixture.parts.find((part) => part.id === plan[0])?.name}`
                : "PROCEDIMIENTO COMPLETADO"}
            </button>
          </section>

          <section className="copilot-section">
            <div className="copilot-header">
              <div className="copilot-orb" />
              <div>
                <span className="section-label">COPILOTO MECÁNICO</span>
                <b>Modo local verificable</b>
              </div>
              <span className="online">EN LÍNEA</span>
            </div>
            <div className="chat-log" aria-live="polite">
              {chat.map((message, index) => (
                <p key={index} className={message.role}>
                  <span>{message.role === "assistant" ? "MM" : "TÚ"}</span>
                  {message.text}
                </p>
              ))}
            </div>
            <form className="chat-form" onSubmit={submit}>
              <label>
                <span className="sr-only">Comando para el copiloto</span>
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Pedí una acción mecánica…"
                />
              </label>
              <button
                type="button"
                className={listening ? "listening" : ""}
                onClick={startVoice}
                aria-label="Dictar comando"
              >
                <MicIcon />
              </button>
              <button type="submit" aria-label="Enviar comando">
                <SendIcon />
              </button>
            </form>
          </section>
        </aside>
      </section>
      <footer className="statusbar">
        <span>
          <i /> {notice}
        </span>
        <span>FIXED STEP 120 Hz</span>
        <span>
          {activeFaultIds.length ? `${activeFaultIds.length} FALLA ACTIVA` : "SIN FALLAS"}
        </span>
        <span>{xrStatus || "XR · DETECCIÓN PROGRESIVA"}</span>
      </footer>
    </main>
  );
}
