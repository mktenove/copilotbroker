import { useState, useEffect, useRef } from "react";

interface UseLazyBackgroundOptions {
  threshold?: number;
  rootMargin?: string;
}

export const useLazyBackground = (
  imageSrc: string,
  options: UseLazyBackgroundOptions = {}
) => {
  const { threshold = 0.1, rootMargin = "100px" } = options;
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.src = imageSrc;
  }, [isInView, imageSrc]);

  return { ref, isLoaded, isInView };
};
