export function encodePcm16(channels: readonly Float32Array[]): ArrayBuffer {
  const frameCount = channels[0]?.length ?? 0;
  if (frameCount === 0 || channels.some((channel) => channel.length !== frameCount)) {
    throw new Error("Аудиозапись получилась пустой или повреждённой.");
  }

  const pcm = new ArrayBuffer(frameCount * 2);
  const view = new DataView(pcm);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let sample = 0;
    for (const channel of channels) sample += channel[frame];
    sample = Math.max(-1, Math.min(1, sample / channels.length));
    view.setInt16(
      frame * 2,
      Math.round(sample < 0 ? sample * 32768 : sample * 32767),
      true,
    );
  }
  return pcm;
}
