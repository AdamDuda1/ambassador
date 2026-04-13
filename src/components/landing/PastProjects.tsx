import Image from "next/image";

import doomPdf from "@/assets/landing/projects-bg/doom-pdf.png";
import librepods from "@/assets/landing/projects-bg/librepods.png";
import vert from "@/assets/landing/projects-bg/vert.png";
import biblicallyAccurate from "@/assets/landing/projects-bg/biblically-accurate.png";
import specter from "@/assets/landing/projects-bg/specter.png";
import blindDefusal from "@/assets/landing/projects-bg/blind-defusal.png";

import orphThumbsUp from "@/assets/landing/emotes/orph-thumbsup.png";
import { useTranslations } from "next-intl";
import { StarIcon } from "lucide-react";

const projects = [
  {
    key: "doom-pdf",
    image: doomPdf,
    textClassName: "text-white",
    href: "https://github.com/ading2210/doompdf",
    stars: "3.8k",
  },
  {
    key: "librepods",
    image: librepods,
    textClassName: "",
    href: "https://github.com/kavishdevar/librepods",
    stars: "26.5k",
  },
  {
    key: "vert",
    image: vert,
    textClassName: "",
    href: "https://github.com/VERT-sh/VERT",
    stars: "14.6k",
  },
  {
    key: "biblically-accurate",
    image: biblicallyAccurate,
    textClassName: "text-white",
    href: "https://github.com/geg-tech/biblicallyaccuratekeyboard",
  },
  {
    key: "specter",
    image: specter,
    textClassName: "text-white",
    href: "https://github.com/ayessaaa/specter",
  },
  {
    key: "blind-defusal",
    image: blindDefusal,
    textClassName: "text-white",
    href: "https://github.com/Jayx2u/blind-defusal",
  },
] as const;

export default function PastProjects() {
  const t = useTranslations("landing.past-projects");

  return (
    <div className="p-12 max-w-7xl mx-auto">
      <h2 className="text-4xl md:text-5xl text-pretty font-jersey">
        {t("title")}
      </h2>
      <div className="mt-8 gap-6 group relative text-black grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <a
            key={project.key}
            href={project.href}
            target="_blank"
            className="relative block shadow-lg group-has-hover:opacity-50 group-has-focus:opacity-50 hover:opacity-100 focus:opacity-100 transition hover:scale-105 focus:scale-105 duration-250 @container"
          >
            <Image
              src={project.image}
              alt={t(`${project.key}.title`)}
              className="w-full h-auto"
              placeholder="blur"
              sizes="(max-width: 640px) calc(100vw - 6rem), (max-width: 1024px) calc(50vw - 3rem), calc(33vw - 2rem)"
            />
            <div
              className={`absolute inset-0 flex flex-col items-center justify-end gap-[4cqw] p-[6.66cqw] text-center leading-tight ${project.textClassName}`}
            >
              <p className="text-[5cqw] font-medium whitespace-pre-wrap">
                {t(`${project.key}.desc`)}
              </p>
              <div className="flex items-center justify-center">
                <p className="text-[3.33cqw]">
                  <span className="text-current/60 italic">{t("by")} </span>
                  {t(`${project.key}.by`)}
                </p>

                {"stars" in project && (
                  <>
                    <StarIcon
                      strokeWidth={2.5}
                      className="size-[3cqw] text-current/60 ml-[3.33cqw] mr-[0.83cqw]"
                    />
                    <p className="text-[3.33cqw] text-current/60">
                      {project.stars}
                    </p>
                  </>
                )}
              </div>
            </div>
          </a>
        ))}

        <Image
          src={orphThumbsUp}
          alt=""
          role="presentation"
          className="h-32 right-0 absolute w-auto bottom-0 translate-y-1/2"
          placeholder="blur"
          sizes="8rem"
        />
      </div>
    </div>
  );
}
